import tape from 'tape'
import Ethash from '../src'
import { getEpoc, getCacheSize, getFullSize } from '../src/util'
import { BlockHeader } from '@sbr/block'
const powTests = require('./ethash_tests.json')

const ethash = new Ethash()
const tests = Object.keys(powTests)

tape('POW tests', function (t) {
  tests.forEach(function (key) {
    const test = powTests[key]
    const header = BlockHeader.fromRLPSerializedHeader(Buffer.from(test.header, 'hex'), {})

    const headerHash = ethash.headerHash(header.raw())
    t.equal(headerHash.toString('hex'), test.header_hash, 'generate header hash')

    const epoc = getEpoc(header.number.toNumber())
    t.equal(getCacheSize(epoc), test.cache_size, 'generate cache size')
    t.equal(getFullSize(epoc), test.full_size, 'generate full cache size')

    ethash.mkcache(test.cache_size, Buffer.from(test.seed, 'hex'))
    t.equal(ethash.cacheHash().toString('hex'), test.cache_hash, 'generate cache')

    const r = ethash.run(headerHash, Buffer.from(test.nonce, 'hex'), test.full_size)
    t.equal(r.hash.toString('hex'), test.result, 'generate result')
    t.equal(r.mix.toString('hex'), test.mixHash, 'generate mix hash')
  })
  t.end()
})
