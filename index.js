const { EventEmitter } = require('events')
const ethUtil = require('ethereumjs-util')
const sigUtil = require('eth-sig-util')
const { TransactionFactory } = require('@ethereumjs/tx');
const type = 'WalletConnect'
const BRIDGE_URL = 'http://localhost:3000'  //walletconnect-connect test server
//const rlp = require('rlp') // todo: remove (unused)

class WalletConnectKeyring extends EventEmitter {
  constructor(opts = {}) {
    super()
    console.warn('In eth-walletconnect-keyring: WalletConnectKeyring constructor: START')
    this.bridgeUrl = null
    this.type = type
    this.page = 0
    this.perPage = 5
    this.unlockedAccount = 0
    this.iframe = null
    this.addressList = []; // DEBUG
    this.deserialize(opts)
    this._setupIframe()
    console.warn('In eth-walletconnect-keyring: WalletConnectKeyring constructor: END')
  }

  serialize() {
    console.warn('In eth-walletconnect-keyring: WalletConnectKeyring serialize(): START')
    return Promise.resolve({
      accounts: this.accounts,
      bridgeUrl: this.bridgeUrl,
      page: this.page
    })
  }

  deserialize(opts = {}) {
    console.warn('In eth-walletconnect-keyring: WalletConnectKeyring deserialize(): START')
    this.bridgeUrl = opts.bridgeUrl || BRIDGE_URL
    this.accounts = opts.accounts || []
    this.page = opts.page || 0
    return Promise.resolve()
  }

  hasAccountKey() {
    console.warn('In eth-walletconnect-keyring: WalletConnectKeyring hasAccountKey(): START')
    const result = (typeof this.accounts !== 'undefined' && this.accounts.length > 0)
    return result
  }

  isUnlocked() {
    console.warn('In eth-walletconnect-keyring: WalletConnectKeyring hasAccountKey(): isUnlocked')
    return Boolean(this.addressList.length > 0)
  }

  setAccountToUnlock(index) {
    console.warn('In eth-walletconnect-keyring: WalletConnectKeyring setAccountToUnlock(): START')
    console.warn('In eth-walletconnect-keyring: WalletConnectKeyring setAccountToUnlock(): index=')
    console.warn(index)
    this.unlockedAccount = parseInt(index, 10)
  }

  unlock(addrIndex) { // todo: use address instead of index?
    console.warn('In eth-walletconnect-keyring: WalletConnectKeyring unlock(): START')
    console.warn('In eth-walletconnect-keyring: WalletConnectKeyring unlock(): addrIndex=')
    console.warn(addrIndex)
    if (this.hasAccountKey() && typeof addrIndex === 'undefined') {
        console.warn('In eth-walletconnect-keyring: WalletConnectKeyring unlock(): addrIndex undefined')
        return Promise.resolve('already unlocked')
    }
    if (this.hasAccountKey() && typeof addrIndex === 'number' ) {
      console.warn('In eth-walletconnect-keyring: WalletConnectKeyring unlock(): addrIndex: ' + addrIndex)
      if (addrIndex>=0 && addrIndex<this.accounts.length){
          return Promise.resolve(this.accounts[addrIndex])
      }else{
          return Promise.resolve(null)
      }
    }

    // this.hasAccountKey() is false
    // unlock: get address from walletconnect
    return new Promise((resolve, reject) => {
      console.warn('In eth-walletconnect-keyring: WalletConnectKeyring unlock(): in promise')
      addrIndex = addrIndex | 0
      this._sendMessage(
        {
          action: 'walletconnect-unlock',
          params: {
            addrIndex, // unused?
          },
        },
        ({ success, payload }) => {
          if (success) {
            this.addressList=[]
            for (let i = 0; i < payload.accounts.length; i++) {
                this.addressList.push(payload.accounts[i].toLowerCase())
            }
            const address = this.addressList[0]
            console.warn('In eth-walletconnect-keyring: WalletConnectKeyring unlock(): SUCCESS!')
            console.warn('In eth-walletconnect-keyring: WalletConnectKeyring unlock(): address:')
            console.warn(address)
            resolve(address)
          } else {
            reject(payload.error || 'Unknown error')
          }
        }
      )
    })
  } // end unlock()

  addAccounts(n = 1) {
    console.warn('In eth-walletconnect-keyring: WalletConnectKeyring addAccounts(): START')
    console.warn('In eth-walletconnect-keyring: WalletConnectKeyring addAccounts(): n=')
    console.warn(n)
    console.warn('In eth-walletconnect-keyring: WalletConnectKeyring addAccounts(): START this.accounts=')
    console.warn(this.accounts)
    return new Promise((resolve, reject) => {
      this.unlock()
        .then(async () => {
          const from = this.unlockedAccount
          const to = from + n
          this.accounts = []
          for (let i = from; i < to; i++) {
            let address = await this.unlock(i)
            if (address != null){
                this.accounts.push(address)
                this.page = 0
            }
          }
          console.warn('In eth-walletconnect-keyring: WalletConnectKeyring addAccounts(): END this.accounts=')
          console.warn(this.accounts)
          resolve(this.accounts)
        })
        .catch(e => {
          reject(e)
        })
    })
  }

  getFirstPage() {
    this.page = 0
    return this.__getPage(1)
  }

  getNextPage() {
    return this.__getPage(1)
  }

  getPreviousPage() {
    return this.__getPage(-1)
  }

  getAccounts() {
    console.warn('In eth-walletconnect-keyring: WalletConnectKeyring getAccounts(): START')
    console.warn('In eth-walletconnect-keyring: WalletConnectKeyring getAccounts(): this.accounts=')
    console.warn(this.accounts)
    return Promise.resolve(this.accounts.slice())
  }

  removeAccount(address) {
    console.warn('In eth-walletconnect-keyring: WalletConnectKeyring removeAccount(): START')
    console.warn('In eth-walletconnect-keyring: WalletConnectKeyring removeAccount(): address=')
    console.warn(address)
    if (!this.accounts.map(a => a.toLowerCase()).includes(address.toLowerCase())) {
      throw new Error(`Address ${address} not found in this keyring`)
    }
    this.accounts = this.accounts.filter(a => a.toLowerCase() !== address.toLowerCase())
  }

  signTransaction (address, tx) {
    console.warn('In eth-walletconnect-keyring: WalletConnectKeyring signTransaction(): START')
    const txData = this._getTxReq(tx, address);
    const chainId = this._getTxChainId(tx, address).toNumber();
    txData.chainId = chainId;
    console.warn('In eth-walletconnect-keyring: WalletConnectKeyring signTransaction(): txData=')
    console.warn(txData)

    // get signature
    return new Promise((resolve, reject) => {
      this.unlock().then(() => {
        console.warn('In eth-walletconnect-keyring: WalletConnectKeyring signTransaction(): after unlock()')
          this._sendMessage({
            action: 'walletconnect-sign-transaction',
            params: {
              tx: txData,
              address
            },
          },
          ({ success, payload }) => {
            if (success) {
              console.warn('In eth-walletconnect-keyring: WalletConnectKeyring signTransaction(): SUCCES')
              console.warn('In eth-walletconnect-keyring: WalletConnectKeyring signTransaction(): PAYLOAD=')
              console.warn(payload)
              // get rsv components without 0x prefix...
              const signature= payload.sig
              // Ensure we got a signature back
              if (!signature) {
                throw new Error('No signature returned.');
              }

              const r= signature.substr(2, 64)
              const s= signature.substr(66, 64)
              const v= signature.substr(130, 2)
              console.warn('In eth-walletconnect-keyring: WalletConnectKeyring signTransaction(): r s v=:')
              console.warn(r)
              console.warn(s)
              console.warn(v)

              // EIP-155
              let v_int= (v === "00")? 0:1;
              if (tx._type == null || tx._type == 0){
                v_int= v_int+ 2*chainId + 35; // for legacy only
              }
              const v_hex= v_int.toString(16);
              console.warn('In eth-walletconnect-keyring: WalletConnectKeyring signTransaction(): v=')
              console.warn(v)
              console.warn('In eth-walletconnect-keyring: WalletConnectKeyring signTransaction(): v_hex=')
              console.warn(v_hex)

              // Pack the signature into the return object
              const txToReturn = tx.toJSON();
              txToReturn.type = tx._type || null;
              txToReturn.r = ethUtil.addHexPrefix(r);
              txToReturn.s = ethUtil.addHexPrefix(s);
              txToReturn.v = ethUtil.addHexPrefix(v_hex);
              console.warn('In eth-walletconnect-keyring: WalletConnectKeyring signTransaction(): txToReturn=')
              console.warn(txToReturn)

              const txSigned= TransactionFactory.fromTxData(txToReturn, {
                common: tx.common, freeze: Object.isFrozen(tx)
              })
              console.warn('In eth-walletconnect-keyring: WalletConnectKeyring signTransaction(): txSigned=')
              console.warn(txSigned)

              const valid = txSigned.verifySignature()
              if (valid) {
                console.warn('In eth-walletconnect-keyring: WalletConnectKeyring signTransaction(): SIGNATURE VALID!')
                resolve(txSigned)
              } else {
                console.warn('In eth-walletconnect-keyring: WalletConnectKeyring signTransaction(): ERROR:')
                console.warn('WalletConnect: The transaction signature is not valid')
                reject(new Error('WalletConnect: The transaction signature is not valid'))
              }
            } else {
              console.warn('In eth-walletconnect-keyring: WalletConnectKeyring signTransaction(): ERROR:')
              console.warn(payload.error || new Error('WalletConnect: Unknown error while signing transaction'))
              reject(payload.error || new Error('WalletConnect: Unknown error while signing transaction'))
            }
          }) // end _sendMessage()
        })
        .catch(reject)
    })
  } // end signTransaction()

  _getTxChainId(tx) {
    console.warn('In eth-walletconnect-keyring: WalletConnectKeyring _getTxChainId(): START')
    if (tx && tx.common && typeof tx.common.chainIdBN === 'function') {
      return tx.common.chainIdBN();
    } else if (tx && tx.chainId) {
      return new BN(tx.chainId);
    }
    return new BN(1);
  }

  // The request data is built by this helper.
  _getTxReq (tx, address) {
    console.warn('In eth-walletconnect-keyring: WalletConnectKeyring _getTxReq(): START')
    let txData;
    try {
      txData = {
        from: address,
        nonce: `0x${tx.nonce.toString('hex')}` || 0,
        gasLimit: `0x${tx.gasLimit.toString('hex')}`,
        to: !!tx.to ? tx.to.toString('hex') : null, // null for contract deployments
        value: `0x${tx.value.toString('hex')}`,
        data: `0x${tx.data.toString('hex')}`,
        //data: tx.data.length === 0 ? null : `0x${tx.data.toString('hex')}`,
      }
      switch (tx._type) {
        case 2: // eip1559
          if ((tx.maxPriorityFeePerGas === null || tx.maxFeePerGas === null) ||
            (tx.maxPriorityFeePerGas === undefined || tx.maxFeePerGas === undefined))
            throw new Error('`maxPriorityFeePerGas` and `maxFeePerGas` must be included for EIP1559 transactions.');
          txData.maxPriorityFeePerGas = `0x${tx.maxPriorityFeePerGas.toString('hex')}`;
          txData.maxFeePerGas = `0x${tx.maxFeePerGas.toString('hex')}`;
          txData.accessList = tx.accessList || [];
          txData.type = 2;
          break;
        case 1: // eip2930
          txData.accessList = tx.accessList || [];
          txData.gasPrice = `0x${tx.gasPrice.toString('hex')}`;
          txData.type = 1;
          break;
        default: // legacy
          txData.gasPrice = `0x${tx.gasPrice.toString('hex')}`;
          txData.type = null;
          break;
      }
    } catch (err) {
      throw new Error(`Failed to build transaction.`)
    }
    console.warn('In eth-walletconnect-keyring: WalletConnectKeyring _getTxReq(): txData=')
    console.warn(txData)
    return txData;
  }

  signMessage(withAccount, data) {
    return this.signPersonalMessage(withAccount, data)
  }

  // The message will be prefixed on the wallet side
  signPersonalMessage(withAccount, message) {
    console.warn('In eth-walletconnect-keyring: WalletConnectKeyring signPersonalMessage(): START')
    return new Promise((resolve, reject) => {
      this.unlock().then(() => {
        this._sendMessage(
          {
            action: 'walletconnect-sign-personal-message',
            params: {
              message,
              address:withAccount
            },
          },
          ({ success, payload }) => {
            if (success) {
              console.warn('In eth-walletconnect-keyring: WalletConnectKeyring signPersonalMessage(): PAYLOAD=')
              console.warn(payload)
              let v= payload.sig.substr(130,2);
              if (v==='1b'){
                  v= "00"
              } else {
                  v= "01"
              }
              const signature= payload.sig.substr(0,130) + v
/*               const addressSignedWith = sigUtil.recoverPersonalSignature({ data: message, sig: signature })
              if (ethUtil.toChecksumAddress(addressSignedWith) !== ethUtil.toChecksumAddress(withAccount)) {
                console.warn('In eth-walletconnect-keyring: WalletConnectKeyring signPersonalMessage(): ERROR: The signature doesnt match the right address!')
                reject(new Error('Ledger: The signature doesnt match the right address'))
              } */
              resolve(signature)
            } else {
              reject(new Error(payload.error || 'WalletConnect: Uknown error while signing message'))
            }
          }
        )
      }).catch(error => reject(error))
    })
  } // end signPersonalMessage()

  signTypedData(withAccount, typedData, options = {}) {
    console.warn('In eth-walletconnect-keyring: WalletConnectKeyring signTypedData(): START')
    console.warn('In eth-walletconnect-keyring: WalletConnectKeyring signTypedData(): typedData=')
    console.warn(typedData)
    console.warn('In eth-walletconnect-keyring: WalletConnectKeyring signTypedData(): options=')
    console.warn(options)
    const isV4 = options.version === 'V4'
    const isV3 = options.version === 'V3'
    if (!isV4 && !isV3) {
      throw new Error('walletconnect: Only version 3 & 4 of typed data signing is supported')
    }

    const {
          domain,
          types,
          primaryType,
          message,
    } = sigUtil.TypedDataUtils.sanitizeData(typedData)
    console.warn('In eth-walletconnect-keyring: WalletConnectKeyring signTypedData(): domain=')
    console.warn(domain)
    console.warn('In eth-walletconnect-keyring: WalletConnectKeyring signTypedData(): types=')
    console.warn(types)
    console.warn('In eth-walletconnect-keyring: WalletConnectKeyring signTypedData(): primaryType=')
    console.warn(primaryType)
    console.warn('In eth-walletconnect-keyring: WalletConnectKeyring signTypedData(): primaryType=')
    console.warn(message)
    const domainSeparatorHex = sigUtil.TypedDataUtils.hashStruct('EIP712Domain', domain, types, isV4).toString('hex')
    const hashStructMessageHex = sigUtil.TypedDataUtils.hashStruct(primaryType, message, types, isV4).toString('hex')
    console.warn('In eth-walletconnect-keyring: WalletConnectKeyring signTypedData(): domainSeparatorHex=')
    console.warn(domainSeparatorHex)
    console.warn('In eth-walletconnect-keyring: WalletConnectKeyring signTypedData(): hashStructMessageHex=')
    console.warn(hashStructMessageHex)

    return new Promise((resolve, reject) => {
      this.unlock().then(() => {
        this._sendMessage(
          {
            action: 'walletconnect-sign-typed-data',
            params: {
              typedData,
              domainSeparatorHex,
              hashStructMessageHex,
              address: withAccount
            },
          },
          ({ success, payload }) => {
            if (success) {
              console.warn('In eth-walletconnect-keyring: WalletConnectKeyring signTypedData(): PAYLOAD=')
              console.warn(payload)
              let v= payload.sig.substr(130,2);
              if (v==='1b'){
                  v= "00"
              } else {
                  v= "01"
              }
              const signature= payload.sig.substr(0,130) + v
/*               const addressSignedWith = sigUtil.recoverPersonalSignature({ data: message, sig: signature })
              if (ethUtil.toChecksumAddress(addressSignedWith) !== ethUtil.toChecksumAddress(withAccount)) {
                console.warn('In eth-walletconnect-keyring: WalletConnectKeyring signPersonalMessage(): ERROR: The signature doesnt match the right address!')
                reject(new Error('Ledger: The signature doesnt match the right address'))
              } */
              resolve(signature)
            } else {
              reject(new Error(payload.error || 'WalletConnect: Uknown error while signing typed data'))
            }
          }
        )
      }).catch(error => reject(error))
    })
  }

  exportAccount() {
    throw new Error('Not supported on this device')
  }

  forgetDevice() {
    this.accounts = []
    this.page = 0
    this.unlockedAccount = 0
  }

  /* PRIVATE METHODS */

  _setupIframe() {
    this.iframe = document.createElement('iframe')
    this.iframe.src = this.bridgeUrl
    document.head.appendChild(this.iframe)
  }

  _sendMessage(msg, cb) {
    console.warn('In eth-walletconnect-keyring: WalletConnectKeyring _sendMessage(): START')
    msg.target = 'WC-IFRAME'
    console.warn(msg)
    this.iframe.contentWindow.postMessage(msg, '*')

    window.addEventListener('message', ({ data }) => {
      if (data && data.action && data.action === `${msg.action}-reply`) {
        console.warn('In eth-walletconnect-keyring: WalletConnectKeyring _sendMessage(): addEventListener()')
        console.warn(data)
        cb(data)
      }
    })
  }

  __getPage(increment) {
    console.warn('In eth-walletconnect-keyring: WalletConnectKeyring __getPage(): START')
    console.warn('In eth-walletconnect-keyring: WalletConnectKeyring __getPage(): increment=')
    console.warn(increment)
    this.page += increment

    if (this.page <= 0) {
      this.page = 1
    }
    const from = (this.page - 1) * this.perPage
    const to = from + this.perPage

    return new Promise((resolve, reject) => {
      this.unlock().then(async () => {
        try{
          let accounts = this._getAccounts(from, to)
          resolve(accounts)
        } catch(error) {
          reject(error)
        }
      })
    })
  }

  _getAccounts(from, to) {
    console.warn('In eth-walletconnect-keyring: WalletConnectKeyring _getAccounts(): START')
    console.warn('In eth-walletconnect-keyring: WalletConnectKeyring _getAccounts(): from=')
    console.warn(from)
    console.warn('In eth-walletconnect-keyring: WalletConnectKeyring _getAccounts(): to=')
    console.warn(to)
    const accounts = []

    for (let i = from; i < to; i++) {
      console.warn('In eth-walletconnect-keyring: WalletConnectKeyring _getAccounts(): for loop: i=')
      console.warn(i)
      if (i<this.addressList.length){
        let address = this.addressList[i]
        accounts.push({
          address: address,
          balance: null,
          index: i,
        })
      }
      console.warn('In eth-walletconnect-keyring: WalletConnectKeyring _getAccounts(): for loop: accounts=')
      console.warn(accounts)
    }
    console.warn('In eth-walletconnect-keyring: WalletConnectKeyring _getAccounts(): accounts=')
    console.warn(accounts)
    return accounts
  }

}

WalletConnectKeyring.type = type
module.exports = WalletConnectKeyring
