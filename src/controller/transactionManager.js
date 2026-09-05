export class TransactionManager {
    constructor(log) {
        this.map = new Map();
        this.log = log;
    }

    add(transaction) {
        this.map.set(transaction.trxid, transaction);
    }

    get(id) {
        return this.map.get(id);
    }

    responded(response) {
        const transaction = this.map.get(response.header.trxid);

        if (!transaction) {
            this.log.error(`Unknown transaction ID: ${response.header.trxid}`);
            return null;
        }

        clearTimeout(transaction.timeout);

        if (transaction.status !== "pending") {
            return transaction;
        }

        transaction.status = "responded";
        transaction.response = response;

        transaction.resolve?.(response);

        return transaction;
    }

    timeout(id,errorMsg) {
        const transaction = this.map.get(id);

        if (!transaction) return;

        if (transaction.status !== "pending") {
            return;
        }

        transaction.status = "timeout";

        transaction.reject?.(new Error(errorMsg));

        return transaction;
    }
    
    allFinished() {
        for (const transaction of this.map.values()) {
            if (transaction.status === "pending") {
                return false;
            }
        }

        return true;
    }

    values() {
        return this.map.values();
    }
}
