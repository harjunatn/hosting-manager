export function getBankDetails() {
  return {
    bankName: process.env.NEXT_PUBLIC_BANK_NAME ?? "Example Bank",
    accountName:
      process.env.NEXT_PUBLIC_BANK_ACCOUNT_NAME ?? "The Red Marker Pte Ltd",
    accountNumber: process.env.NEXT_PUBLIC_BANK_ACCOUNT_NUMBER ?? "123-456-789",
    swift: process.env.NEXT_PUBLIC_BANK_SWIFT ?? "EXAMPLSGSG",
  };
}
