import multisigWalletService, { EVENT_CONFIRMATION, EVENT_CONFIRMATION_NEEDED, EVENT_DEPOSIT, EVENT_MULTI_TRANSACTION, EVENT_OWNER_ADDED, EVENT_OWNER_REMOVED, EVENT_REVOKE } from 'services/MultisigWalletService'
import contractsManagerDAO from 'dao/ContractsManagerDAO'
import type MultisigWalletDAO from 'dao/MultisigWalletDAO'
import type MultisigWalletModel from 'models/Wallet/MultisigWalletModel'
import type MultisigWalletPendingTxModel from 'models/Wallet/MultisigWalletPendingTxModel'
import TokenModel from 'models/TokenModel'
import type WalletNoticeModel from 'models/notices/WalletNoticeModel'
import { DUCK_SESSION } from 'redux/session/actions'
import { notify } from 'redux/notifier/actions'

export const DUCK_MULTISIG_WALLET = 'multisigWallet'

export const MULTISIG_FETCHING = 'multisig/FETCHING'
export const MULTISIG_FETCHED = 'multisig/FETCHED'

export const MULTISIG_UPDATE = 'multisigWallet/UPDATE'
export const MULTISIG_SELECT = 'multisigWallet/SELECT'
export const MULTISIG_REMOVE = 'multisigWallet/REMOVE'

const updateWallet = (wallet: MultisigWalletModel) => (dispatch) => {
  dispatch({ type: MULTISIG_UPDATE, wallet })
}

export const watchMultisigWallet = (wallet: MultisigWalletModel) => async () => {
  try {
    return multisigWalletService.subscribeToWalletDAO(wallet)
  } catch (e) {
    // eslint-disable-next-line
    console.error('watch error', e.message)
  }
}

export const watchWalletManager = () => async (dispatch, getState) => {
  const dao = await contractsManagerDAO.getWalletsManagerDAO()
  await dao.watchWalletCreate((wallet: MultisigWalletModel, notice: WalletNoticeModel) => {
    // address arrived, delete temporary hash
    dispatch({ type: MULTISIG_REMOVE, id: wallet.id() })
    dispatch(updateWallet(wallet.transactionHash(null).isPending(false)))
    dispatch(notify(notice))
    watchMultisigWallet(wallet)
    const wallets = getState().get(DUCK_MULTISIG_WALLET)
    if (wallets.size() === 1) {
      dispatch(selectMultisigWallet(wallets.first()))
    }
  })

  // multisig wallet events
  multisigWalletService.on(EVENT_OWNER_ADDED, (walletId, ownerAddress) => {
    const wallet = getState().get(DUCK_MULTISIG_WALLET).item(walletId)
    const owners = wallet.owners().push(ownerAddress)
    dispatch(updateWallet(wallet.owners(owners)))
  })

  multisigWalletService.on(EVENT_OWNER_REMOVED, (walletId, ownerAddress) => {
    const wallet = getState().get(DUCK_MULTISIG_WALLET).item(walletId)
    const owners = wallet.owners().remove(ownerAddress)
    dispatch(updateWallet(wallet.owners(owners)))
  })

  multisigWalletService.on(EVENT_MULTI_TRANSACTION, (walletId, multisigTransactionModel) => {
    let wallet = getState().get(DUCK_MULTISIG_WALLET).item(walletId)
    const pendingTxList = wallet.pendingTxList().remove(multisigTransactionModel)
    const tokens = wallet.tokens()
    let token: TokenModel = tokens.get(multisigTransactionModel.symbol())
    if (!token) {
      // eslint-disable-next-line
      console.error('token not found', multisigTransactionModel.symbol())
      return
    }
    token = token.updateBalance(false, multisigTransactionModel.value())

    dispatch(updateWallet(wallet.pendingTxList(pendingTxList).tokens(tokens.set(token.id(), token))))
  })

  multisigWalletService.on('SingleTransact', (walletId, result) => {
    // eslint-disable-next-line
    console.log('--actions#', result)
  })

  multisigWalletService.on(EVENT_REVOKE, (walletId, id) => {
    const wallet: MultisigWalletModel = getState().get(DUCK_MULTISIG_WALLET).item(walletId)
    const pendingTxList = wallet.pendingTxList()
    const pendingTx = pendingTxList.item(id).isConfirmed(false)
    dispatch(updateWallet(wallet.pendingTxList(pendingTxList.list(pendingTxList.list().set(id, pendingTx)))))
  })

  multisigWalletService.on(EVENT_CONFIRMATION, (walletId, id, owner) => {
    if (owner !== getState().get(DUCK_SESSION).account) {
      return
    }

    const wallet: MultisigWalletModel = getState().get(DUCK_MULTISIG_WALLET).item(walletId)
    const pendingTxList = wallet.pendingTxList()
    let pendingTx = pendingTxList.item(id)
    if (!pendingTx) {
      return
    }
    pendingTx = pendingTx.isConfirmed(true)
    dispatch(updateWallet(wallet.pendingTxList(pendingTxList.list(pendingTxList.list().set(id, pendingTx)))))
  })

  multisigWalletService.on(EVENT_CONFIRMATION_NEEDED, (walletId, pendingTxModel: MultisigWalletPendingTxModel) => {
    const wallet: MultisigWalletModel = getState().get(DUCK_MULTISIG_WALLET).item(walletId)
    const pendingTxList = wallet.pendingTxList()
    dispatch(updateWallet(wallet.pendingTxList(pendingTxList.update(pendingTxModel))))
  })

  multisigWalletService.on(EVENT_DEPOSIT, (walletId, tokenId, amount) => {
    const wallet: MultisigWalletModel = getState().get(DUCK_MULTISIG_WALLET).item(walletId)
    const token: TokenModel = wallet.tokens().get(tokenId)
    dispatch(updateWallet(wallet.tokens(wallet.tokens().set(token.id(), token.updateBalance(true, amount)))))
    // dispatch(notify(notice))
  })
}

export const selectMultisigWallet = (wallet: MultisigWalletModel) => (dispatch) => {
  dispatch({ type: MULTISIG_SELECT, wallet })
}

export const getWallets = () => async (dispatch) => {
  dispatch({ type: MULTISIG_FETCHING })
  const dao = await contractsManagerDAO.getWalletsManagerDAO()
  const wallets = await dao.getWallets()
  const walletsArray = wallets.toArray()

  // watch for every wallet
  for (let wallet of walletsArray) {
    dispatch(watchMultisigWallet(wallet))
  }

  dispatch({ type: MULTISIG_FETCHED, wallets })
  if (wallets.first()) {
    dispatch(selectMultisigWallet(wallets.first()))
  }
  return wallets
}

export const createWallet = (wallet: MultisigWalletModel) => async (dispatch) => {
  try {
    const dao = await contractsManagerDAO.getWalletsManagerDAO()
    const txHash = await dao.createWallet(wallet)
    dispatch(updateWallet(wallet.isPending(true).transactionHash(txHash)))
    return txHash
  } catch (e) {
    // eslint-disable-next-line
    console.error('create wallet error', e.message)
  }
}

export const removeWallet = (wallet: MultisigWalletModel) => async (dispatch, getState) => {
  try {
    const { account } = getState().get(DUCK_SESSION)
    dispatch(updateWallet(wallet.isPending(true)))
    const dao: MultisigWalletDAO = multisigWalletService.getWalletDAO(wallet.address())
    await dao.removeWallet(wallet, account)
  } catch (e) {
    // eslint-disable-next-line
    console.error('delete error', e.message)
  }
}

export const addOwner = (wallet: MultisigWalletModel, ownerAddress: string) => async (dispatch) => {
  dispatch(updateWallet(wallet.isPending(true)))
  try {
    const dao: MultisigWalletDAO = multisigWalletService.getWalletDAO(wallet.address())
    await dao.addOwner(wallet, ownerAddress)
  } catch (e) {
    // eslint-disable-next-line
    console.error('error', e.message)
  }
}

export const removeOwner = (wallet, ownerAddress) => async (dispatch) => {
  dispatch(updateWallet(wallet.isPending(true)))
  try {
    const dao: MultisigWalletDAO = multisigWalletService.getWalletDAO(wallet.address())
    await dao.removeOwner(wallet, ownerAddress)
  } catch (e) {
    // eslint-disable-next-line
    console.error('error', e.message)
  }
}

export const multisigTransfer = (wallet, token, amount, recipient) => async (dispatch, getState) => {
  try {
    const dao: MultisigWalletDAO = multisigWalletService.getWalletDAO(wallet.address())
    await dao.transfer(wallet, token, amount, recipient)
  } catch (e) {
    // eslint-disable-next-line
    console.error('error', e.message)
  }
}

export const confirmMultisigTx = (wallet, tx: MultisigWalletPendingTxModel) => async (dispatch) => {
  try {
    const dao: MultisigWalletDAO = multisigWalletService.getWalletDAO(wallet.address())
    await dao.confirmPendingTx(tx)
  } catch (e) {
    // eslint-disable-next-line
    console.error('error', e.message)
  }
}

export const revokeMultisigTx = (wallet: MultisigWalletModel, tx: MultisigWalletPendingTxModel) => async (dispatch) => {
  try {
    const dao: MultisigWalletDAO = multisigWalletService.getWalletDAO(wallet.address())
    await dao.revokePendingTx(tx)
  } catch (e) {
    // eslint-disable-next-line
    console.error('error', e.message)
  }
}
