declare namespace NodeJS {
  interface ProcessEnv {
    NETWORK: string;
    PORT: string;
    SPONSOR_NAME: string;
    SPONSOR_MNEMONIC: string;
    WORKER_WAITING_TIME_IN_MS: string;
    INITIAL_TOKENS_FOR_VOUCHER: string;
    INITIAL_VOUCHER_EXPIRATION_TIME_IN_BLOCKS: string;
    MIN_TOKENS_FOR_VOUCHER: string;
    TOKENS_TO_ADD_TO_VOUCHER: string;
    NEW_VOUCHER_EXPIRATION_TIME_IN_BLOCKS: string;
    CONTRACT_ADDRESS: string;
  }
}