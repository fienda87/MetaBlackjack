import { db } from './db';
import { encrypt, decrypt, generateSecureToken } from './security';

const ENCRYPTION_KEY = process.env.DB_ENCRYPTION_KEY || 'default-encryption-key-change-in-production';

// Database encryption utilities
export class DBSecurity {
  // Encrypt sensitive data before storing
  static encryptSensitiveData(data: string): string {
    return encrypt(data, ENCRYPTION_KEY);
  }

  // Decrypt sensitive data after retrieving
  static decryptSensitiveData(encryptedData: string): string {
    return decrypt(encryptedData, ENCRYPTION_KEY);
  }

  // Create user with encrypted sensitive fields
  static async createUser(userData: {
    walletAddress: string;
    username?: string;
    email?: string;
    password?: string;
  }) {
    const { password, ...otherData } = userData;
    
    const createData: any = {
      ...otherData,
      emailVerificationToken: generateSecureToken(32)
    };

    // Hash password if provided
    if (password) {
      const { hashPassword } = await import('./security');
      createData.passwordHash = await hashPassword(password);
    }

    return await db.user.create({
      data: createData
    });
  }

  // Update user with encryption
  static async updateUserSecure(userId: string, updates: any) {
    const sanitizedUpdates = { ...updates };

    // Encrypt sensitive fields
    if (updates.apiKey) {
      sanitizedUpdates.apiKey = this.encryptSensitiveData(updates.apiKey);
    }
    
    if (updates.apiSecret) {
      sanitizedUpdates.apiSecret = this.encryptSensitiveData(updates.apiSecret);
    }
    
    if (updates.twoFactorSecret) {
      sanitizedUpdates.twoFactorSecret = this.encryptSensitiveData(updates.twoFactorSecret);
    }

    return await db.user.update({
      where: { id: userId },
      data: sanitizedUpdates
    });
  }

  // Get user with decrypted sensitive fields
  static async getUserSecure(userId: string) {
    const user = await db.user.findUnique({
      where: { id: userId }
    });

    if (!user) return null;

    // Decrypt sensitive fields
    const decryptedUser = { ...user };
    
    if (user.apiKey) {
      decryptedUser.apiKey = this.decryptSensitiveData(user.apiKey);
    }
    
    if (user.apiSecret) {
      decryptedUser.apiSecret = this.decryptSensitiveData(user.apiSecret);
    }
    
    if (user.twoFactorSecret) {
      decryptedUser.twoFactorSecret = this.decryptSensitiveData(user.twoFactorSecret);
    }

    return decryptedUser;
  }

  // Create wallet with encrypted private key
  static async createWallet(walletData: {
    userId: string;
    currency: string;
    address?: string;
    privateKey?: string;
    type?: string;
  }) {
    const { privateKey, ...otherData } = walletData;
    
    const createData: any = { ...otherData };

    // Encrypt private key if provided
    if (privateKey) {
      createData.encryptedPrivateKey = this.encryptSensitiveData(privateKey);
    }

    return await db.wallet.create({
      data: createData
    });
  }

  // Get wallet with decrypted private key
  static async getWalletSecure(userId: string, currency: string) {
    const wallet = await db.wallet.findUnique({
      where: {
        userId_currency: {
          userId,
          currency
        }
      }
    });

    if (!wallet) return null;

    // Decrypt private key
    const decryptedWallet: any = { ...wallet };
    
    if (wallet.encryptedPrivateKey) {
      decryptedWallet.privateKey = this.decryptSensitiveData(wallet.encryptedPrivateKey);
      delete decryptedWallet.encryptedPrivateKey; // Remove encrypted version
    }

    return decryptedWallet;
  }

  // Secure transaction creation
  static async createTransaction(transactionData: {
    userId: string;
    type: string;
    amount: number;
    description?: string;
    referenceId?: string;
    balanceBefore: number;
    balanceAfter: number;
    metadata?: any;
  }) {
    // Validate transaction data
    if (transactionData.amount < 0) {
      throw new Error('Transaction amount cannot be negative');
    }

    if (transactionData.balanceAfter < 0) {
      throw new Error('Insufficient balance');
    }

    return await db.transaction.create({
      data: {
        ...transactionData,
        amount: transactionData.amount.toString(), // Convert to string
        status: 'SUCCESS' // Changed from COMPLETED to SUCCESS
      } as any
    });
  }

  // Backup sensitive data
  static async backupUserData(userId: string) {
    const user = await this.getUserSecure(userId);
    const wallets = await db.wallet.findMany({
      where: { userId }
    });
    const transactions = await db.transaction.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 100
    });

    if (!user) throw new Error('User not found')
    
    return {
      user: {
        id: user.id,
        walletAddress: user.walletAddress,
        username: user.username,
        email: user.email,
        balance: user.balance,
        createdAt: user.createdAt
      },
      wallets: wallets.map(w => ({
        currency: w.currency,
        balance: w.balance,
        address: w.address,
        type: w.type,
        createdAt: w.createdAt
      })),
      transactions: transactions.map(t => ({
        type: t.type,
        amount: t.amount,
        description: t.description,
        status: t.status,
        createdAt: t.createdAt
      })),
      backupDate: new Date().toISOString()
    };
  }

  // Data cleanup and anonymization
  static async anonymizeUserData(userId: string) {
    // Anonymize user data
    await db.user.update({
      where: { id: userId },
      data: {
        username: `deleted_user_${generateSecureToken(8)}`,
        email: null,
        passwordHash: null,
        apiKey: null,
        apiSecret: null,
        twoFactorSecret: null,
        isActive: false,
        emailVerified: false
      }
    });

    // Delete sensitive wallet data
    await db.wallet.updateMany({
      where: { userId },
      data: {
        address: null,
        encryptedPrivateKey: null
      }
    });

    return true;
  }

  // Database integrity check
  static async checkDatabaseIntegrity() {
    const issues: string[] = [];

    try {
      // Check for users with negative balances
      const usersWithNegativeBalance = await db.user.count({
        where: { balance: { lt: 0 } }
      });
      
      if (usersWithNegativeBalance > 0) {
        issues.push(`${usersWithNegativeBalance} users have negative balances`);
      }

      // Check for orphaned transactions
      const orphanedTransactions = await db.transaction.count({
        where: {
          userId: { equals: null } as any
        }
      });
      
      if (orphanedTransactions > 0) {
        issues.push(`${orphanedTransactions} orphaned transactions found`);
      }

      // Check for games without valid players
      const orphanedGames = await db.game.count({
        where: {
          playerId: { equals: null } as any
        }
      });
      
      if (orphanedGames > 0) {
        issues.push(`${orphanedGames} orphaned games found`);
      }

      return {
        isHealthy: issues.length === 0,
        issues
      };

    } catch (error) {
      issues.push(`Database integrity check failed: ${error}`);
      return {
        isHealthy: false,
        issues
      };
    }
  }
}