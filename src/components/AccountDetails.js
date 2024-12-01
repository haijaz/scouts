import React, { useState } from 'react';
import { Table, Button, Modal } from 'react-bootstrap';
import TransactionForm from './TransactionForm';

function AccountDetails({ scout, onEditTransaction, onDeleteTransaction }) {
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState(null);

  const handleEdit = (transaction) => {
    setEditingTransaction(transaction);
    setShowEditModal(true);
  };

  const handleUpdate = (updatedTransaction) => {
    onEditTransaction(scout.id, editingTransaction.id, updatedTransaction);
    setShowEditModal(false);
    setEditingTransaction(null);
  };

  return (
    <div>
      <h3>{scout.name}'s Account Details</h3>
      <h4>Current Balance: ${scout.balance.toFixed(2)}</h4>
      <h5>Transaction History</h5>
      <Table striped bordered>
        <thead>
          <tr>
            <th>Date</th>
            <th>Description</th>
            <th>Category</th>
            <th>Amount</th>
            <th>Balance</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {scout.transactions.map((transaction, index) => {
            const runningBalance = scout.transactions
              .slice(0, index + 1)
              .reduce((sum, t) => sum + t.amount, 0);
            
            return (
              <tr key={transaction.id}>
                <td>{new Date(transaction.date).toLocaleDateString()}</td>
                <td>{transaction.description}</td>
                <td>{transaction.category}</td>
                <td className={transaction.amount >= 0 ? 'text-success' : 'text-danger'}>
                  ${Math.abs(transaction.amount).toFixed(2)}
                  {transaction.amount >= 0 ? ' (deposit)' : ' (payment)'}
                </td>
                <td>${runningBalance.toFixed(2)}</td>
                <td>
                  <Button
                    size="sm"
                    variant="outline-primary"
                    className="me-2"
                    onClick={() => handleEdit(transaction)}
                  >
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="outline-danger"
                    onClick={() => onDeleteTransaction(scout.id, transaction.id)}
                  >
                    Delete
                  </Button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </Table>

      <Modal show={showEditModal} onHide={() => setShowEditModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Edit Transaction</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {editingTransaction && (
            <TransactionForm
              initialData={editingTransaction}
              onAddTransaction={handleUpdate}
              isEditing={true}
            />
          )}
        </Modal.Body>
      </Modal>
    </div>
  );
}

export default AccountDetails; 