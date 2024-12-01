import React, { useState } from 'react';
import { Form, Button, Row, Col } from 'react-bootstrap';

function TransferForm({ scouts, onTransfer }) {
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [fromScout, setFromScout] = useState('unit');
  const [toScout, setToScout] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    
    onTransfer({
      fromScoutId: fromScout,
      toScoutId: toScout,
      amount: parseFloat(amount),
      description: description || 'Transfer'
    });

    // Reset form
    setAmount('');
    setDescription('');
    setFromScout('unit');
    setToScout('');
  };

  return (
    <Form onSubmit={handleSubmit} className="mb-4">
      <h4>Transfer Funds</h4>
      <Row>
        <Col md={6}>
          <Form.Group className="mb-3">
            <Form.Label>From Account</Form.Label>
            <Form.Select
              value={fromScout}
              onChange={(e) => {
                setFromScout(e.target.value);
                if (e.target.value === toScout) {
                  setToScout('');
                }
              }}
              required
            >
              <option value="unit">Unit Account</option>
              {scouts.map(scout => (
                <option key={scout.id} value={scout.id}>
                  {scout.name}
                </option>
              ))}
            </Form.Select>
          </Form.Group>
        </Col>
        <Col md={6}>
          <Form.Group className="mb-3">
            <Form.Label>To Account</Form.Label>
            <Form.Select
              value={toScout}
              onChange={(e) => {
                setToScout(e.target.value);
                if (e.target.value === fromScout) {
                  setFromScout('');
                }
              }}
              required
            >
              <option value="">Select Account</option>
              <option value="unit" disabled={fromScout === 'unit'}>Unit Account</option>
              {scouts.map(scout => (
                <option 
                  key={scout.id} 
                  value={scout.id}
                  disabled={fromScout === scout.id.toString()}
                >
                  {scout.name}
                </option>
              ))}
            </Form.Select>
          </Form.Group>
        </Col>
      </Row>
      <Row>
        <Col md={6}>
          <Form.Group className="mb-3">
            <Form.Label>Amount ($)</Form.Label>
            <Form.Control
              type="number"
              step="0.01"
              min="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />
          </Form.Group>
        </Col>
        <Col md={6}>
          <Form.Group className="mb-3">
            <Form.Label>Description (Optional)</Form.Label>
            <Form.Control
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Transfer description"
            />
          </Form.Group>
        </Col>
      </Row>
      <Button type="submit" variant="primary">
        Transfer Funds
      </Button>
    </Form>
  );
}

export default TransferForm; 