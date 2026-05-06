"use strict";

function clone(value) {
  return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
}

class FakeDocSnapshot {
  constructor(ref, node) {
    this.ref = ref;
    this.id = ref.id;
    this.exists = Boolean(node);
    this._node = node || null;
  }

  data() {
    return this._node ? clone(this._node.data) : undefined;
  }
}

class FakeQuerySnapshot {
  constructor(docs) {
    this.docs = docs;
    this.empty = docs.length === 0;
  }
}

class FakeDocRef {
  constructor(db, path) {
    this._db = db;
    this.path = path.slice();
    this.id = String(path[path.length - 1]);
  }

  async get() {
    return new FakeDocSnapshot(this, this._db._getDocNode(this.path, false));
  }

  async set(data) {
    this._db._setDocNode(this.path, clone(data));
  }

  async update(updates) {
    this._db._updateDocNode(this.path, clone(updates));
  }

  async delete() {
    this._db._deleteDocNode(this.path);
  }

  collection(name) {
    return new FakeCollectionRef(this._db, this.path.concat([String(name)]));
  }
}

class FakeQuery {
  constructor(collectionRef, options = {}) {
    this._collectionRef = collectionRef;
    this._filters = options.filters || [];
    this._orderBy = options.orderBy || null;
    this._limit = options.limit || null;
    this._startAfter = options.startAfter;
  }

  where(field, op, value) {
    return new FakeQuery(this._collectionRef, {
      ...this,
      filters: this._filters.concat([{ field, op, value }]),
    });
  }

  orderBy(field, direction = "asc") {
    return new FakeQuery(this._collectionRef, {
      ...this,
      orderBy: { field, direction: direction === "desc" ? "desc" : "asc" },
    });
  }

  limit(count) {
    return new FakeQuery(this._collectionRef, {
      ...this,
      limit: Number(count),
    });
  }

  startAfter(value) {
    return new FakeQuery(this._collectionRef, {
      ...this,
      startAfter: value,
    });
  }

  async get() {
    let docs = this._collectionRef._getSnapshots();

    for (const filter of this._filters) {
      docs = docs.filter((doc) => matchesFilter(doc.data()?.[filter.field], filter.op, filter.value));
    }

    if (this._orderBy) {
      const { field, direction } = this._orderBy;
      docs.sort((a, b) => compareValues(a.data()?.[field], b.data()?.[field]) * (direction === "desc" ? -1 : 1));
    }

    if (this._startAfter !== undefined && this._startAfter !== null && this._orderBy) {
      const { field, direction } = this._orderBy;
      docs = docs.filter((doc) => {
        const value = doc.data()?.[field];
        return direction === "desc" ? compareValues(value, this._startAfter) < 0 : compareValues(value, this._startAfter) > 0;
      });
    }

    if (typeof this._limit === "number" && Number.isFinite(this._limit)) {
      docs = docs.slice(0, Math.max(0, this._limit));
    }

    return new FakeQuerySnapshot(docs);
  }
}

class FakeCollectionRef extends FakeQuery {
  constructor(db, path) {
    super(null);
    this._db = db;
    this.path = path.slice();
    this.id = String(path[path.length - 1]);
    this._collectionRef = this;
    this._filters = [];
    this._orderBy = null;
    this._limit = null;
    this._startAfter = undefined;
  }

  doc(id) {
    return new FakeDocRef(this._db, this.path.concat([id ? String(id) : this._db._nextId()]));
  }

  async add(data) {
    const ref = this.doc();
    await ref.set(data);
    return ref;
  }

  _getSnapshots() {
    const collection = this._db._getCollectionMap(this.path, false);
    if (!collection) return [];
    return Array.from(collection.entries()).map(([id, node]) => new FakeDocSnapshot(new FakeDocRef(this._db, this.path.concat([id])), node));
  }
}

class FakeBatch {
  constructor() {
    this._ops = [];
  }

  set(ref, data) {
    this._ops.push(() => ref.set(data));
    return this;
  }

  update(ref, data) {
    this._ops.push(() => ref.update(data));
    return this;
  }

  delete(ref) {
    this._ops.push(() => ref.delete());
    return this;
  }

  async commit() {
    for (const op of this._ops) {
      await op();
    }
  }
}

class FakeTransaction {
  constructor(db) {
    this._db = db;
  }

  async get(ref) {
    return ref.get();
  }

  update(ref, data) {
    this._db._updateDocNode(ref.path, clone(data));
  }
}

class FakeFirestore {
  constructor(seed = {}) {
    this._root = new Map();
    this._idCounter = 1;
    this._seed(seed);
  }

  collection(name) {
    return new FakeCollectionRef(this, [String(name)]);
  }

  batch() {
    return new FakeBatch();
  }

  async runTransaction(handler) {
    return handler(new FakeTransaction(this));
  }

  _seed(seed) {
    for (const [collectionName, docs] of Object.entries(seed || {})) {
      const collectionRef = this.collection(collectionName);
      for (const [docId, value] of Object.entries(docs || {})) {
        const { __collections = {}, ...data } = value || {};
        this._setDocNode([collectionName, docId], clone(data));
        for (const [subName, subDocs] of Object.entries(__collections)) {
          for (const [subId, subValue] of Object.entries(subDocs || {})) {
            const { __collections: nested = {}, ...subData } = subValue || {};
            this._setDocNode([collectionName, docId, subName, subId], clone(subData));
            if (Object.keys(nested).length) {
              this._seedNested([collectionName, docId, subName, subId], nested);
            }
          }
        }
      }
    }
  }

  _seedNested(basePath, nestedCollections) {
    for (const [subName, subDocs] of Object.entries(nestedCollections || {})) {
      for (const [subId, subValue] of Object.entries(subDocs || {})) {
        const { __collections = {}, ...subData } = subValue || {};
        this._setDocNode(basePath.concat([subName, subId]), clone(subData));
        if (Object.keys(__collections).length) {
          this._seedNested(basePath.concat([subName, subId]), __collections);
        }
      }
    }
  }

  _nextId() {
    return `doc_${this._idCounter++}`;
  }

  _getCollectionMap(path, create = false) {
    let collections = this._root;
    for (let index = 0; index < path.length; index += 2) {
      const collectionName = String(path[index]);
      if (!collections.has(collectionName)) {
        if (!create) return null;
        collections.set(collectionName, new Map());
      }
      const collection = collections.get(collectionName);
      if (index === path.length - 1) {
        return collection;
      }

      const docId = String(path[index + 1]);
      let node = collection.get(docId);
      if (!node) {
        if (!create) return null;
        node = { data: {}, collections: new Map() };
        collection.set(docId, node);
      }
      collections = node.collections;
    }
    return null;
  }

  _getDocNode(path, create = false) {
    const collection = this._getCollectionMap(path.slice(0, -1), create);
    if (!collection) return null;
    const docId = String(path[path.length - 1]);
    let node = collection.get(docId);
    if (!node && create) {
      node = { data: {}, collections: new Map() };
      collection.set(docId, node);
    }
    return node || null;
  }

  _setDocNode(path, data) {
    const collection = this._getCollectionMap(path.slice(0, -1), true);
    const docId = String(path[path.length - 1]);
    const existing = collection.get(docId);
    collection.set(docId, {
      data: clone(data) || {},
      collections: existing?.collections || new Map(),
    });
  }

  _updateDocNode(path, updates) {
    const node = this._getDocNode(path, false);
    if (!node) {
      throw new Error("Document does not exist");
    }
    node.data = { ...node.data, ...(clone(updates) || {}) };
  }

  _deleteDocNode(path) {
    const collection = this._getCollectionMap(path.slice(0, -1), false);
    if (!collection) return;
    collection.delete(String(path[path.length - 1]));
  }
}

function compareValues(left, right) {
  if (left === right) return 0;
  if (left === undefined || left === null) return -1;
  if (right === undefined || right === null) return 1;
  return left < right ? -1 : 1;
}

function matchesFilter(actual, op, expected) {
  switch (op) {
    case "==":
      return actual === expected;
    case "!=":
      return actual !== expected;
    case ">=":
      return compareValues(actual, expected) >= 0;
    case "<":
      return compareValues(actual, expected) < 0;
    case "in":
      return Array.isArray(expected) ? expected.includes(actual) : false;
    default:
      throw new Error(`Unsupported operator: ${op}`);
  }
}

module.exports = {
  FakeFirestore,
};
