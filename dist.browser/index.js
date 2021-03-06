"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __read = (this && this.__read) || function (o, n) {
    var m = typeof Symbol === "function" && o[Symbol.iterator];
    if (!m) return o;
    var i = m.call(o), r, ar = [], e;
    try {
        while ((n === void 0 || n-- > 0) && !(r = i.next()).done) ar.push(r.value);
    }
    catch (error) { e = { error: error }; }
    finally {
        try {
            if (r && !r.done && (m = i["return"])) m.call(i);
        }
        finally { if (e) throw e.error; }
    }
    return ar;
};
Object.defineProperty(exports, "__esModule", { value: true });
var sbr_util_1 = require("sbr-util");
var util_1 = require("./util");
var xor = require('buffer-xor');
var Ethash = /** @class */ (function () {
    function Ethash(cacheDB) {
        this.dbOpts = {
            valueEncoding: 'json',
        };
        this.cacheDB = cacheDB;
        this.cache = [];
    }
    Ethash.prototype.mkcache = function (cacheSize, seed) {
        // console.log('generating cache')
        // console.log('size: ' + cacheSize)
        // console.log('seed: ' + seed.toString('hex'))
        var n = Math.floor(cacheSize / util_1.params.HASH_BYTES);
        var o = [sbr_util_1.keccak(seed, 512)];
        var i;
        for (i = 1; i < n; i++) {
            o.push(sbr_util_1.keccak(o[o.length - 1], 512));
        }
        for (var _ = 0; _ < util_1.params.CACHE_ROUNDS; _++) {
            for (i = 0; i < n; i++) {
                var v = o[i].readUInt32LE(0) % n;
                o[i] = sbr_util_1.keccak(xor(o[(i - 1 + n) % n], o[v]), 512);
            }
        }
        this.cache = o;
        return this.cache;
    };
    Ethash.prototype.calcDatasetItem = function (i) {
        var n = this.cache.length;
        var r = Math.floor(util_1.params.HASH_BYTES / util_1.params.WORD_BYTES);
        var mix = Buffer.from(this.cache[i % n]);
        mix.writeInt32LE(mix.readUInt32LE(0) ^ i, 0);
        mix = sbr_util_1.keccak(mix, 512);
        for (var j = 0; j < util_1.params.DATASET_PARENTS; j++) {
            var cacheIndex = util_1.fnv(i ^ j, mix.readUInt32LE((j % r) * 4));
            mix = util_1.fnvBuffer(mix, this.cache[cacheIndex % n]);
        }
        return sbr_util_1.keccak(mix, 512);
    };
    Ethash.prototype.run = function (val, nonce, fullSize) {
        if (!fullSize && this.fullSize) {
            fullSize = this.fullSize;
        }
        if (!fullSize) {
            throw new Error('fullSize needed');
        }
        var n = Math.floor(fullSize / util_1.params.HASH_BYTES);
        var w = Math.floor(util_1.params.MIX_BYTES / util_1.params.WORD_BYTES);
        var s = sbr_util_1.keccak(Buffer.concat([val, util_1.bufReverse(nonce)]), 512);
        var mixhashes = Math.floor(util_1.params.MIX_BYTES / util_1.params.HASH_BYTES);
        var mix = Buffer.concat(Array(mixhashes).fill(s));
        var i;
        for (i = 0; i < util_1.params.ACCESSES; i++) {
            var p = (util_1.fnv(i ^ s.readUInt32LE(0), mix.readUInt32LE((i % w) * 4)) % Math.floor(n / mixhashes)) *
                mixhashes;
            var newdata = [];
            for (var j = 0; j < mixhashes; j++) {
                newdata.push(this.calcDatasetItem(p + j));
            }
            mix = util_1.fnvBuffer(mix, Buffer.concat(newdata));
        }
        var cmix = Buffer.alloc(mix.length / 4);
        for (i = 0; i < mix.length / 4; i = i + 4) {
            var a = util_1.fnv(mix.readUInt32LE(i * 4), mix.readUInt32LE((i + 1) * 4));
            var b = util_1.fnv(a, mix.readUInt32LE((i + 2) * 4));
            var c = util_1.fnv(b, mix.readUInt32LE((i + 3) * 4));
            cmix.writeUInt32LE(c, i);
        }
        return {
            mix: cmix,
            hash: sbr_util_1.keccak256(Buffer.concat([s, cmix])),
        };
    };
    Ethash.prototype.cacheHash = function () {
        return sbr_util_1.keccak256(Buffer.concat(this.cache));
    };
    Ethash.prototype.headerHash = function (rawHeader) {
        return sbr_util_1.rlphash(rawHeader.slice(0, -2));
    };
    /**
     * Loads the seed and cache given a block number.
     */
    Ethash.prototype.loadEpoc = function (number) {
        return __awaiter(this, void 0, void 0, function () {
            var epoc, findLastSeed, data, error_1, _a, seed, foundEpoc, cache;
            var _this = this;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        epoc = util_1.getEpoc(number);
                        if (this.epoc === epoc) {
                            return [2 /*return*/];
                        }
                        this.epoc = epoc;
                        if (!this.cacheDB) {
                            throw new Error('cacheDB needed');
                        }
                        findLastSeed = function (epoc) { return __awaiter(_this, void 0, void 0, function () {
                            var data, error_2;
                            return __generator(this, function (_a) {
                                switch (_a.label) {
                                    case 0:
                                        if (epoc === 0) {
                                            return [2 /*return*/, [sbr_util_1.zeros(32), 0]];
                                        }
                                        _a.label = 1;
                                    case 1:
                                        _a.trys.push([1, 3, , 4]);
                                        return [4 /*yield*/, this.cacheDB.get(epoc, this.dbOpts)];
                                    case 2:
                                        data = _a.sent();
                                        return [3 /*break*/, 4];
                                    case 3:
                                        error_2 = _a.sent();
                                        if (error_2.type !== 'NotFoundError') {
                                            throw error_2;
                                        }
                                        return [3 /*break*/, 4];
                                    case 4:
                                        if (data) {
                                            return [2 /*return*/, [data.seed, epoc]];
                                        }
                                        else {
                                            return [2 /*return*/, findLastSeed(epoc - 1)];
                                        }
                                        return [2 /*return*/];
                                }
                            });
                        }); };
                        _b.label = 1;
                    case 1:
                        _b.trys.push([1, 3, , 4]);
                        return [4 /*yield*/, this.cacheDB.get(epoc, this.dbOpts)];
                    case 2:
                        data = _b.sent();
                        return [3 /*break*/, 4];
                    case 3:
                        error_1 = _b.sent();
                        if (error_1.type !== 'NotFoundError') {
                            throw error_1;
                        }
                        return [3 /*break*/, 4];
                    case 4:
                        if (!!data) return [3 /*break*/, 7];
                        this.cacheSize = util_1.getCacheSize(epoc);
                        this.fullSize = util_1.getFullSize(epoc);
                        return [4 /*yield*/, findLastSeed(epoc)];
                    case 5:
                        _a = __read.apply(void 0, [_b.sent(), 2]), seed = _a[0], foundEpoc = _a[1];
                        this.seed = util_1.getSeed(seed, foundEpoc, epoc);
                        cache = this.mkcache(this.cacheSize, this.seed);
                        // store the generated cache
                        return [4 /*yield*/, this.cacheDB.put(epoc, {
                                cacheSize: this.cacheSize,
                                fullSize: this.fullSize,
                                seed: this.seed,
                                cache: cache,
                            }, this.dbOpts)];
                    case 6:
                        // store the generated cache
                        _b.sent();
                        return [3 /*break*/, 8];
                    case 7:
                        // Object.assign(this, data)
                        this.cache = data.cache.map(function (a) {
                            return Buffer.from(a);
                        });
                        this.cacheSize = data.cacheSize;
                        this.fullSize = data.fullSize;
                        this.seed = Buffer.from(data.seed);
                        _b.label = 8;
                    case 8: return [2 /*return*/];
                }
            });
        });
    };
    Ethash.prototype._verifyPOW = function (header) {
        return __awaiter(this, void 0, void 0, function () {
            var headerHash, number, difficulty, mixHash, nonce, a, result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        headerHash = this.headerHash(header.raw());
                        number = header.number, difficulty = header.difficulty, mixHash = header.mixHash, nonce = header.nonce;
                        return [4 /*yield*/, this.loadEpoc(number.toNumber())];
                    case 1:
                        _a.sent();
                        a = this.run(headerHash, nonce);
                        result = new sbr_util_1.BN(a.hash);
                        return [2 /*return*/, a.mix.equals(mixHash) && sbr_util_1.TWO_POW256.div(difficulty).cmp(result) === 1];
                }
            });
        });
    };
    Ethash.prototype.verifyPOW = function (block) {
        return __awaiter(this, void 0, void 0, function () {
            var valid, index, valid_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        // don't validate genesis blocks
                        if (block.header.isGenesis()) {
                            return [2 /*return*/, true];
                        }
                        return [4 /*yield*/, this._verifyPOW(block.header)];
                    case 1:
                        valid = _a.sent();
                        if (!valid) {
                            return [2 /*return*/, false];
                        }
                        index = 0;
                        _a.label = 2;
                    case 2:
                        if (!(index < block.uncleHeaders.length)) return [3 /*break*/, 5];
                        return [4 /*yield*/, this._verifyPOW(block.uncleHeaders[index])];
                    case 3:
                        valid_1 = _a.sent();
                        if (!valid_1) {
                            return [2 /*return*/, false];
                        }
                        _a.label = 4;
                    case 4:
                        index++;
                        return [3 /*break*/, 2];
                    case 5: return [2 /*return*/, true];
                }
            });
        });
    };
    return Ethash;
}());
exports.default = Ethash;
//# sourceMappingURL=index.js.map