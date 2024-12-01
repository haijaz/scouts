import React, { useState } from 'react';
import { ListGroup, Form, Button } from 'react-bootstrap';

function ScoutList({ scouts, onAddScout, onSelectScout, selectedScout }) {
  const [newScoutName, setNewScoutName] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    onAddScout(newScoutName);
    setNewScoutName('');
  };

  const unitAccount = scouts.find(scout => scout.is_unit_account);
  const regularScouts = scouts.filter(scout => !scout.is_unit_account);

  return (
    <div>
      <h3>Accounts</h3>
      <ListGroup className="mb-3">
        {unitAccount && (
          <ListGroup.Item
            action
            active={selectedScout?.id === unitAccount.id}
            onClick={() => onSelectScout(unitAccount)}
          >
            {unitAccount.name} - ${unitAccount.balance.toFixed(2)}
          </ListGroup.Item>
        )}
        {regularScouts.map(scout => (
          <ListGroup.Item
            key={scout.id}
            action
            active={selectedScout?.id === scout.id}
            onClick={() => onSelectScout(scout)}
          >
            {scout.name} - ${scout.balance.toFixed(2)}
          </ListGroup.Item>
        ))}
      </ListGroup>

      <Form onSubmit={handleSubmit}>
        <Form.Group className="mb-3">
          <Form.Label>Add New Scout</Form.Label>
          <Form.Control
            type="text"
            value={newScoutName}
            onChange={(e) => setNewScoutName(e.target.value)}
            placeholder="Enter scout name"
            required
          />
        </Form.Group>
        <Button type="submit" variant="primary">
          Add Scout
        </Button>
      </Form>
    </div>
  );
}

export default ScoutList; 