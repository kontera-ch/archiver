import { MerkleTree } from 'merkletreejs'
import { ProofFactory } from './ProofFactory';
import { blake2bHex } from 'blakejs'
import { ContractAbstraction, ContractProvider, TezosToolkit } from '@taquito/taquito';
import { ProofTemplate } from '@tzstamp/proof';

export class TezosSigner {
  private hashesToInclude = new Set<string>()

  constructor(private contract: ContractAbstraction<ContractProvider>, private tezosToolkit: TezosToolkit, private logger: { log: (msg: string) => void } = { log: console.log }) {
      //
  }

  stamp(hash: string) {
    this.hashesToInclude.add(hash)
    this.logger.log(`added ${hash} to hashes. ${this.hashesToInclude.size} pending.`)
  }

  private digest(): { hashes: string[], rootHash: Buffer } {
    const merkleTree = new MerkleTree([], blake2bHex) 

    const hashes = [...this.hashesToInclude.values()]
    this.hashesToInclude.clear()

    hashes.forEach(data => merkleTree.addLeaf(Buffer.from(data), true))

    return { hashes, rootHash: merkleTree.getRoot() }
  }

  async commit(): Promise<{ proof?: ProofTemplate, rootHash?: string, hashes: string[] }> {
    const { hashes, rootHash } = this.digest()

    if (hashes.length === 0) {
      this.logger.log('skipping this commit, no hashes.')
      return { hashes: [] }
    }

    const rootHashHex = rootHash.toString('hex')
    this.logger.log(`Digested Hash of MerkleTree: ${rootHashHex}`)
    
    const opGroup = await this.contract.methods.default(rootHashHex).send()
    this.logger.log(`Sent to contract ${this.contract.address}, operation hash ${opGroup.hash}. Waiting for confirmation...`)
    
    const level = await opGroup.confirmation(3)
    this.logger.log(`Confirmation with 3 blocks achieved, fetching block ${level}`)
    
    const block = await this.tezosToolkit.rpc.getBlock({ block: String(level - 2) }) // 2 blocks before 3rd confirmation
    this.logger.log(`Got block ${level}, created at ${block.header.timestamp}, constructing proof`)

    const proof = ProofFactory.buildHighProof(block, opGroup.hash, rootHash)
    return { proof: proof.toJSON(), rootHash: rootHashHex, hashes } 
  }

}
