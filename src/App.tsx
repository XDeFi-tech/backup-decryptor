import './App.css';
import React, { useState, useRef, useEffect } from 'react'
import { WalletDecryptor } from './utils/helpers'
import CopyIcon from './copy.svg'
interface Phrase {
  label: string
  phrase: string
}

function App() {
  const[filename, setFilename] = useState('')
  const[backupFileJSON, setBackupFileJSON] = useState<any>()
  const[keyStores, setKeyStores] = useState<any>([])
  const[password, setPassword] = useState<string>("")
  const[recoveryCode, setRecoveryCode] = useState<string>("")
  const[useRecoveryCode, setUseRecoveryCode] = useState<boolean>(false)
  const[masterKeyStore, setMasterKeyStores] = useState<any>(undefined)
  const[seedPhrases, setSeedPhrases] = useState<any>([])
  const[error, setError] = useState<string>("")

  useEffect(() => {
    try{
      if (backupFileJSON) {
        setError("")
        setPassword("")
        setSeedPhrases([])
        setRecoveryCode("")
        console.log(backupFileJSON)
        if(backupFileJSON.masterKey) {
          setMasterKeyStores(backupFileJSON.masterKey)
          const wallets = Object.values(backupFileJSON?.accounts?.wallets)
          setKeyStores(wallets.map((wallet: any) => ({ ...wallet.walletInfo.data, label: wallet.label })))
        } else if(backupFileJSON.masterKeystore) {
          setMasterKeyStores(backupFileJSON.masterKeystore.keystore.masterKey)
          const wallets = Object.values(backupFileJSON?.wallets?.wallets)
          setKeyStores(wallets.map((wallet: any) => ({ ...wallet.walletInfo.data, label: wallet.label })))
        } else if(backupFileJSON.criticalData) {
          setMasterKeyStores(backupFileJSON.criticalData.masterKey)
          const wallets = Object.values(backupFileJSON?.accounts?.wallets)
          setKeyStores(wallets.map((wallet: any) => ({ ...wallet.walletInfo.data, label: wallet.label })))
        } else if(backupFileJSON.rootKeystore) {
          setMasterKeyStores(undefined)
          setKeyStores([{ ...backupFileJSON.rootKeystore, label: backupFileJSON.rootLabel }])
        } else {
          setMasterKeyStores(undefined)
          setKeyStores([{ ...backupFileJSON, label: 'Seed Phrase' }])
        }
      }
    } catch(e) {
      console.error(e)
    }

  }, [backupFileJSON])

  const inputRef = useRef<HTMLInputElement>(null)

  const deepParseJSON = (data: any): any => {
    if (typeof data === 'string') {
      try {
        return deepParseJSON(JSON.parse(data)); // Parse the string and recurse
      } catch {
        return data; // Return the original string if parsing fails
      }
    } else if (Array.isArray(data)) {
      return data.map(deepParseJSON); // Recursively parse array elements
    } else if (typeof data === 'object' && data !== null) {
      return Object.fromEntries(
        Object.entries(data).map(([key, value]) => [key, deepParseJSON(value)])
      ); // Recursively parse object properties
    }
    return data; // Return the value if it's neither a string, array, nor object
  }

  const handlerBrowse = (): void => {
    if (inputRef && inputRef.current) inputRef.current.click()
  }

  const handlerFileChange = ({ target }: React.ChangeEvent<HTMLInputElement>): void => {
    if (!target) return

    const { files } = target

    if (!files) {
      setFilename('Browse')
      return
    }

    if (files.length) {
      const file = files[0]
      setFilename(file.name)
      const fr = new FileReader()

      fr.readAsText(file)
      fr.onloadend = (e): void => {
        if (!e.target || !e.target.result) return
        try {
          const backupFile = JSON.parse(e.target.result.toString())
          setBackupFileJSON(deepParseJSON(backupFile))
        } catch (err) {
          console.log(err)
        }
      }
    }
  }

  const getSeedPhraseFromWallet = ( walletDecryptor: any) => {
    Promise.allSettled<Phrase>(keyStores.map((keyStore: any) => {
        return walletDecryptor.getSeedPhrase(keyStore).then((phrases: any) => {
          return { label: keyStore.label, phrases }
        })
      })
    ).then((promises: PromiseSettledResult<Phrase>[]) => {
      // @ts-ignore
      const successfullPromises = promises.filter(promise => promise.status === 'fulfilled').map((promise: PromiseFulfilledResult<Phrase>) => promise.value)
      setSeedPhrases(successfullPromises)
      setError("")
    })
      .catch(e => {
        console.error(e)
        setSeedPhrases([])
        setError(e)
      })
  }

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    if(!masterKeyStore) {
      WalletDecryptor.fromPassword(password, keyStores[0]).then(walletDecryptor =>{
        return [{ label: keyStores[0].label, phrases: walletDecryptor.getMasterSeedPhrase() }]
      }).then(phrases => {
        setSeedPhrases(phrases)
        setError("")
      })
        .catch(e => {
          console.error(e)
          setSeedPhrases([])
          setError(e)
        })
    }
    else {
      if (useRecoveryCode) {
        WalletDecryptor.fromRecoveryCode(recoveryCode)
          .then(getSeedPhraseFromWallet)
          .catch(e => {
            console.error(e)
            setSeedPhrases([])
            setError(e)
          })
      } else
        WalletDecryptor.fromPassword(password, masterKeyStore)
          .then(getSeedPhraseFromWallet)
          .catch(e => {
            console.error(e)
            setSeedPhrases([])
            setError(e)
          })
    }

  }

  return (
    <div className="App">
      <header className="App-header">
        XDEFI Backup Decryptor
      </header>
      <h2>
        Select the a backup file to be decrypted
      </h2>
      <div className="body">
        {filename===''}
        <input
          type="file"
          name="file"
          ref={inputRef}
          style={{ display: 'none' }}
          required
          onChange={handlerFileChange}
        />
        <div className="fileSelection">
          Select File <button onClick={handlerBrowse}> {filename==='' ? 'Browse Files' : filename} </button>
        </div>

        {!!keyStores.length &&
            <form onSubmit={handleSubmit}>
                <div className="password">
                  {useRecoveryCode ?(<div>
                      Recovery Code <input
                      placeholder='  recovery code'
                      onChange={e => setRecoveryCode(e.target.value)}
                      type="text" title="recoveryCode"
                      name="recoveryCode"
                      value={recoveryCode}
                    />
                      <button
                        type="button"
                        onClick={() => {
                          setUseRecoveryCode(false)}
                        }
                      > Switch to password</button>
                    </div>
                  ):(<div>
                    Password <input
                    placeholder='  password'
                    onChange={e => setPassword(e.target.value)}
                    type="password" title="password"
                    name="password" value={password}
                  />
                    {masterKeyStore && <button
                        type="button"
                        onClick={() => {
                          setUseRecoveryCode(true)
                        }}
                    >
                        Switch to Recovery Code
                    </button>
                    }
                  </div>)
                  }
                </div>
                <button type="submit">Get Seed Phrase</button>
            </form>
        }
        <div className="accounts">
          {seedPhrases.map((seedPhrase: any) => {
            return (
              <div className="account" key={seedPhrase.label}>
                {seedPhrase.label}: {seedPhrase.phrases}
                <img
                  src={CopyIcon}
                  onClick={() => {
                    navigator.clipboard.writeText(seedPhrase.phrases)
                      .then(() => alert('Copied seed phrase'))}
                  }
                  alt={'copy'}/>
              </div>
            )
          })}
        </div>
        {error !=='' && <div className="error"> {error} </div> }
      </div>
    </div>
  );
}

export default App;