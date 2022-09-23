import { Module } from '@nestjs/common';
import { NoopContract } from '@/lib/tezos/contract/NoopContract';
import { TezosClient } from '@/lib/tezos/TezosClient';
import { GoogleCloudModule } from '../GoogleCloud/GoogleCloudModule';
import { ProofController } from './controllers/ProofController';
import { StampingService } from './services/StampingService';
import { StampQueueService } from './services/StampQueueService';
import { PgBossModule } from '../PgBossModule/PgBossModule';
import { WebhookModule } from '../WebhookModule/WebhookModule';
import { ConfigService } from '@nestjs/config';
import { KonteraRpcClient } from '@/lib/tezos/KonteraRpcClient';

@Module({
  imports: [GoogleCloudModule, WebhookModule, PgBossModule],
  controllers: [ProofController],
  providers: [
    StampQueueService,
    {
      provide: StampingService,
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => {
        const contractAddress = configService.get<string>('TEZOS_NOOP_CONTRACT_ADDRESS', 'KT1FzuCxZqCMNYW9rGEHMpHdRsrjZ7eqFS3U')
        const tezosRpcNode = configService.get<string>('TEZOS_RPC_NODE', 'https://rpc.tzkt.io/ithacanet')
        const tezosFaucetKey = configService.get<string>('TEZOS_FAUCET_KEY')
        const tezosPrivateKey = configService.get<string>('TEZOS_PRIVATE_KEY')

        const client = new TezosClient(new KonteraRpcClient(tezosRpcNode));
        
        if (tezosFaucetKey) {
          await client.setupSignerUsingFaucetKey(JSON.parse(tezosFaucetKey))
        } else if (tezosPrivateKey) {
          await client.setupSignerUsingPrivateKey(tezosPrivateKey)
        }

        const tezosContract = new NoopContract(contractAddress, client.toolkit);
        
        await tezosContract.init();

        return new StampingService(client, tezosContract, configService);
      }
    }
  ],
  exports: []
})
export class ProofModule {}
