import CryptoJS from 'crypto-js'
import {
  decryptFromKeystore as _decryptFromKeystore,
  Keystore as xchainKeystore,
} from '@xchainjs/xchain-crypto'
import * as bip39 from 'bip39'

const generateMasterSeedPhrase = async (
  masterPassword: string,
  masterKeystore: any
): Promise<string> => {
  return decryptFromKeystore(masterKeystore, masterPassword)
}
export const entropyToPhrase = (entropy: string): string => {
  return bip39.entropyToMnemonic(entropy)
}

const hashStringValue = (string: string) => {
  return CryptoJS.SHA256(string).toString(CryptoJS.enc.Hex)
}

const decryptFromKeystore = async (
  keystore: any,
  password: string
): Promise<string> => {
  return  _decryptFromKeystore(
    keystore as xchainKeystore,
    password
  )
}
export class WalletDecryptor {
  private readonly masterSeedPhrase: string

  constructor(masterSeedPhrase: string) {
    this.masterSeedPhrase = masterSeedPhrase
  }

  public static fromPassword = async (masterPassword: string, masterKeyStore: any) => {
    const masterSeedPhrase = await generateMasterSeedPhrase(masterPassword, masterKeyStore)
    return new WalletDecryptor(masterSeedPhrase);
  };

  public static fromRecoveryCode = async (recoveryCode: string) => {
    const masterSeedPhrase = await entropyToPhrase(recoveryCode)
    return new WalletDecryptor(masterSeedPhrase);
  };

  getMasterSeedPhrase = () => this.masterSeedPhrase


  getSeedPhrase = async (
    walletKeystore: any
  ): Promise<string> => {
    const keyStore = walletKeystore?.keystore ? walletKeystore.keystore : walletKeystore
    const { ed25519 } = keyStore.publickeys
    const pubKey = ed25519.pubKey.data || Array.from(ed25519.toBuffer())
    const password = hashStringValue(`${this.masterSeedPhrase}${pubKey.toString()}`)
    return decryptFromKeystore(keyStore, password)
  }
}
