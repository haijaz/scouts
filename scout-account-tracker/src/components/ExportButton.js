import React from 'react';
import { Button } from 'react-bootstrap';
import * as XLSX from 'xlsx';

function ExportButton({ scouts }) {
  const exportToExcel = () => {
    // Create workbook
    const wb = XLSX.utils.book_new();
    
    // Create balance sheet
    const balanceData = scouts.map(scout => ({
      'Account Name': scout.name,
      'Balance': scout.balance,
    }));
    
    const balanceSheet = XLSX.utils.json_to_sheet(balanceData);
    XLSX.utils.book_append_sheet(wb, balanceSheet, 'Account Balances');

    // Create transactions sheet
    const transactionData = [];
    scouts.forEach(scout => {
      if (scout.transactions) {
        scout.transactions.forEach(transaction => {
          transactionData.push({
            'Account': scout.name,
            'Date': new Date(transaction.date).toLocaleDateString(),
            'Description': transaction.description,
            'Category': transaction.category,
            'Amount': transaction.amount,
            'Balance After': transaction.amount + (transactionData.length > 0 ? 
              transactionData[transactionData.length - 1]['Balance After'] : 0)
          });
        });
      }
    });

    const transactionSheet = XLSX.utils.json_to_sheet(transactionData);
    XLSX.utils.book_append_sheet(wb, transactionSheet, 'Transactions');

    // Save the file
    const fileName = `scout_accounts_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(wb, fileName);
  };

  return (
    <Button 
      variant="success" 
      onClick={exportToExcel}
      className="mb-3"
    >
      Export to Excel
    </Button>
  );
}

export default ExportButton; 