import {abstractNoticeModel} from './NoticeModel';
import CBEModel from '../CBEModel';

class CBENoticeModel extends abstractNoticeModel({
    cbe: null,
    revoke: false
}) {
    constructor(data) {
        super({
            ...data,
            cbe: data.cbe instanceof CBEModel ? data.cbe : new CBEModel(data.cbe)
        });
    }

    message() {
        return 'CBE ' + this.get('cbe').address() + ' ' + (this.get('revoke') ? 'was revoked.' : 'was added.');
    };
}

export default CBENoticeModel;