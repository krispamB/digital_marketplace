import { Contract } from '@algorandfoundation/tealscript';

export class DigitalMarketplace extends Contract {
  /** ID of asset we are selling */
  assetId = GlobalStateKey<AssetID>();

  /** The cost of buying one unit of the asset */
  unitaryPrice = GlobalStateKey<uint64>();

  /**
   * Create the Application
   *
   * @param assetId The asset we are selling
   * @param unitaryPrice The price of one asset
   */
  createApplication(assetId: AssetID, unitaryPrice: uint64): void {
    this.assetId.value = assetId;

    this.unitaryPrice.value = unitaryPrice;
  }

  /**
   * Setting the new unitary price of the asset
   *
   * @param unitaryPrice The new unitary price
   */
  setPrice(unitaryPrice: uint64): void {
    assert(this.txn.sender === this.app.creator);

    this.unitaryPrice.value = unitaryPrice;
  }

  /**
   * Opt the contract address into the asset
   *
   * @param mbrTxn The payment transaction that pays for the Minimum Balance Requirement
   */
  optIntoAsset(mbrTxn: PayTxn): void {
    assert(this.txn.sender === this.app.creator);
    verifyPayTxn(mbrTxn, {
      receiver: this.app.address,
      amount: globals.minBalance + globals.assetOptInMinBalance,
    });

    sendAssetTransfer({
      xferAsset: this.assetId.value,
      assetAmount: 0,
      assetReceiver: this.app.address,
    });
  }

  /**
   * Buy the asset
   *
   * @param buyerTxn The payment transaction that pays for the asset
   * @param quantity The quantity of the asset to buy
   */
  buy(buyerTxn: PayTxn, quantity: uint64): void {
    assert(this.assetId.value.id !== 0, 'The asset ID is not set');
    assert(this.unitaryPrice.value !== 0, 'The unitary Price is not set');

    verifyPayTxn(buyerTxn, {
      sender: this.txn.sender,
      receiver: this.app.address,
      amount: this.unitaryPrice.value * quantity,
    });

    sendAssetTransfer({
      xferAsset: this.assetId.value,
      assetAmount: quantity,
      assetReceiver: this.txn.sender,
    });
  }

  /**
   * Method to delete the application.
   * It sends the remaining balance and the remaining assets to the creator.
   */
  deleteApplication(): void {
    assert(this.txn.sender === this.app.creator);

    // Sends the remaining assets to the app creator.
    sendAssetTransfer({
      xferAsset: this.assetId.value,
      assetReceiver: this.app.creator,
      assetAmount: this.app.address.assetBalance(this.assetId.value),
      assetCloseTo: this.app.creator,
    });

    // sends the remaining app balance to the creator
    sendPayment({
      receiver: this.app.creator,
      amount: this.app.address.balance,
      closeRemainderTo: this.app.creator,
    });
  }
}
