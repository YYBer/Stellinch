import * as crypto from 'crypto';
import * as StellarSdk from '@stellar/stellar-sdk';

/**
 * Stellar HTLC Contract Implementation
 * Uses real Stellar SDK to create HTLC functionality with payment transactions
 */

export interface StellarHTLCConfig {
  secret: string;
  hashlock: string;
  amount: string;
  makerAddress: string;
  takerAddress: string;
  timelock: number; // Unix timestamp
  network: 'testnet' | 'mainnet';
}

export interface StellarHTLCTransaction {
  id: string;
  type: 'fund' | 'claim' | 'refund';
  from: string;
  to: string;
  amount: string;
  memo: string;
  signature?: string;
  xdr: string;
  hash: string;
}

export class StellarHTLC {
  private config: StellarHTLCConfig;
  private contractId: string;
  private server: StellarSdk.Horizon.Server;
  private networkPassphrase: string;

  constructor(config: StellarHTLCConfig) {
    this.config = config;
    this.contractId = this.generateContractId();
    
    // Initialize Stellar server and network
    if (config.network === 'testnet') {
      this.server = new StellarSdk.Horizon.Server('https://horizon-testnet.stellar.org');
      this.networkPassphrase = StellarSdk.Networks.TESTNET;
    } else {
      this.server = new StellarSdk.Horizon.Server('https://horizon.stellar.org');
      this.networkPassphrase = StellarSdk.Networks.PUBLIC;
    }
  }

  private generateContractId(): string {
    const data = JSON.stringify({
      hashlock: this.config.hashlock,
      maker: this.config.makerAddress,
      taker: this.config.takerAddress,
      amount: this.config.amount,
      timelock: this.config.timelock
    });
    return crypto.createHash('sha256').update(data).digest('hex').substring(0, 16);
  }

  public getContractId(): string {
    return this.contractId;
  }

  /**
   * Validate secret against hashlock
   */
  public validateSecret(secret: string): boolean {
    const secretBuffer = Buffer.from(secret.replace('0x', ''), 'hex');
    const calculatedHash = crypto.createHash('sha256').update(secretBuffer).digest('hex');
    const expectedHash = this.config.hashlock.replace('0x', '');
    return calculatedHash === expectedHash;
  }

  /**
   * Check if timelock has expired
   */
  public isTimelockExpired(): boolean {
    return Date.now() / 1000 > this.config.timelock;
  }

  /**
   * Create funding transaction XDR (pre-signed by taker)
   */
  public async createFundingTransaction(takerKeypair: StellarSdk.Keypair): Promise<StellarHTLCTransaction> {
    try {
      // Load taker account
      const takerAccount = await this.server.loadAccount(takerKeypair.publicKey());
      
      // Create payment transaction
      const transaction = new StellarSdk.TransactionBuilder(takerAccount, {
        fee: StellarSdk.BASE_FEE,
        networkPassphrase: this.networkPassphrase,
      })
      .addOperation(StellarSdk.Operation.payment({
        destination: this.config.makerAddress,
        asset: StellarSdk.Asset.native(),
        amount: this.config.amount,
      }))
      .addMemo(StellarSdk.Memo.text(`HTLC_FUND_${this.contractId}`))
      .setTimeout(300) // 5 minutes timeout
      .build();
      
      // Sign transaction
      transaction.sign(takerKeypair);
      
      const xdr = transaction.toXDR();
      const hash = transaction.hash().toString('hex');
      
      return {
        id: hash,
        type: 'fund',
        from: this.config.takerAddress,
        to: this.config.makerAddress,
        amount: this.config.amount,
        memo: `HTLC_FUND_${this.contractId}`,
        xdr,
        hash
      };
    } catch (error) {
      throw new Error(`Failed to create funding transaction: ${error.message}`);
    }
  }

  /**
   * Create claiming transaction XDR (reveals secret)
   */
  public async createClaimingTransaction(secret: string, makerKeypair: StellarSdk.Keypair): Promise<StellarHTLCTransaction> {
    if (!this.validateSecret(secret)) {
      throw new Error('Invalid secret provided');
    }

    if (this.isTimelockExpired()) {
      throw new Error('Timelock has expired, cannot claim');
    }

    try {
      // Load maker account
      const makerAccount = await this.server.loadAccount(makerKeypair.publicKey());
      
      // Create claiming transaction - this is just a memo transaction that reveals the secret
      const memo = `HTLC_CLAIM_${this.contractId}_${secret.replace('0x', '')}`;
      
      const transaction = new StellarSdk.TransactionBuilder(makerAccount, {
        fee: StellarSdk.BASE_FEE,
        networkPassphrase: this.networkPassphrase,
      })
      .addOperation(StellarSdk.Operation.manageData({
        name: `htlc_secret_${this.contractId}`,
        value: secret.replace('0x', ''),
      }))
      .addMemo(StellarSdk.Memo.text(memo))
      .setTimeout(300) // 5 minutes timeout
      .build();
      
      // Sign transaction
      transaction.sign(makerKeypair);
      
      const xdr = transaction.toXDR();
      const hash = transaction.hash().toString('hex');
      
      return {
        id: hash,
        type: 'claim',
        from: this.config.makerAddress,
        to: this.config.makerAddress,
        amount: this.config.amount,
        memo,
        xdr,
        hash
      };
    } catch (error) {
      throw new Error(`Failed to create claiming transaction: ${error.message}`);
    }
  }

  /**
   * Create refund transaction XDR (after timelock expires)
   */
  public async createRefundTransaction(makerKeypair: StellarSdk.Keypair): Promise<StellarHTLCTransaction> {
    if (!this.isTimelockExpired()) {
      throw new Error('Timelock has not expired yet, cannot refund');
    }

    try {
      // Load maker account
      const makerAccount = await this.server.loadAccount(makerKeypair.publicKey());
      
      // Create refund transaction - payment back to taker
      const transaction = new StellarSdk.TransactionBuilder(makerAccount, {
        fee: StellarSdk.BASE_FEE,
        networkPassphrase: this.networkPassphrase,
      })
      .addOperation(StellarSdk.Operation.payment({
        destination: this.config.takerAddress,
        asset: StellarSdk.Asset.native(),
        amount: this.config.amount,
      }))
      .addMemo(StellarSdk.Memo.text(`HTLC_REFUND_${this.contractId}`))
      .setTimeout(300) // 5 minutes timeout
      .build();
      
      // Sign transaction
      transaction.sign(makerKeypair);
      
      const xdr = transaction.toXDR();
      const hash = transaction.hash().toString('hex');
      
      return {
        id: hash,
        type: 'refund',
        from: this.config.makerAddress,
        to: this.config.takerAddress,
        amount: this.config.amount,
        memo: `HTLC_REFUND_${this.contractId}`,
        xdr,
        hash
      };
    } catch (error) {
      throw new Error(`Failed to create refund transaction: ${error.message}`);
    }
  }

  /**
   * Submit transaction to Stellar network
   */
  public async submitTransaction(xdr: string): Promise<StellarSdk.Horizon.HorizonApi.SubmitTransactionResponse> {
    try {
      const transaction = new StellarSdk.Transaction(xdr, this.networkPassphrase);
      const result = await this.server.submitTransaction(transaction);
      return result;
    } catch (error) {
      throw new Error(`Failed to submit transaction: ${error.message}`);
    }
  }

  /**
   * Extract secret from a claiming transaction on Stellar network
   */
  public async extractSecretFromTransactionHash(txHash: string): Promise<string | null> {
    try {
      // Get transaction details from Stellar network
      const transaction = await this.server.transactions().transaction(txHash).call();
      
      // Check memo for secret
      if (transaction.memo && transaction.memo_type === 'text') {
        const memoMatch = transaction.memo.match(/HTLC_CLAIM_[^_]+_([a-fA-F0-9]+)/);
        if (memoMatch) {
          const secret = '0x' + memoMatch[1];
          if (this.validateSecret(secret)) {
            return secret;
          }
        }
      }

      // Check operations for manageData operation containing secret
      for (const operation of transaction.operations) {
        if (operation.type === 'manage_data' && operation.name?.startsWith(`htlc_secret_${this.contractId}`)) {
          const secret = '0x' + operation.value;
          if (this.validateSecret(secret)) {
            return secret;
          }
        }
      }

      return null;
    } catch (error) {
      throw new Error(`Failed to extract secret from transaction: ${error.message}`);
    }
  }

  /**
   * Extract secret from a claiming transaction (local)
   */
  public extractSecretFromTransaction(tx: StellarHTLCTransaction): string | null {
    if (tx.type !== 'claim') {
      return null;
    }

    // Extract secret from memo
    const memoMatch = tx.memo.match(/HTLC_CLAIM_[^_]+_([a-fA-F0-9]+)/);
    if (!memoMatch) {
      return null;
    }

    const secret = '0x' + memoMatch[1];
    if (this.validateSecret(secret)) {
      return secret;
    }

    return null;
  }

  /**
   * Get transaction status from Stellar network
   */
  public async getTransactionStatus(txHash: string): Promise<'success' | 'failed' | 'pending' | 'not_found'> {
    try {
      const transaction = await this.server.transactions().transaction(txHash).call();
      return transaction.successful ? 'success' : 'failed';
    } catch (error) {
      if (error.response?.status === 404) {
        return 'not_found';
      }
      return 'pending';
    }
  }

  /**
   * Get contract summary
   */
  public getSummary() {
    return {
      contractId: this.contractId,
      hashlock: this.config.hashlock,
      amount: this.config.amount,
      makerAddress: this.config.makerAddress,
      takerAddress: this.config.takerAddress,
      timelock: this.config.timelock,
      timelockExpired: this.isTimelockExpired(),
      network: this.config.network
    };
  }
}