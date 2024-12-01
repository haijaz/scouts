import React, { useState } from 'react';
import { ListGroup, Form, Button } from 'react-bootstrap';

function ScoutList({ scouts, onAddScout, onSelectScout, selectedScout }) {
  const [newScoutName, setNewScoutName] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (newScoutName.trim()) {
      onAddScout(newScoutName.trim());
      setNewScoutName('');
    }
  };

  return (
    <div>
      <h3>Scouts</h3>
      <Form onSubmit={handleSubmit} className="mb-3">
        <Form.Group className="d-flex">
          <Form.Control
            type="text"
            value={newScoutName}
            onChange={(e) => setNewScoutName(e.target.value)}
            placeholder="New scout name"
          />
          <Button type="submit" className="ms-2">Add</Button>
        </Form.Group>
      </Form>
      <ListGroup>
        {scouts.map(scout => (
          <ListGroup.Item
            key={scout.id}
            active={selectedScout?.id === scout.id}
            onClick={() => onSelectScout(scout)}
            className="d-flex justify-content-between align-items-center"
          >
            {scout.name}
            <span>${scout.balance.toFixed(2)}</span>
          </ListGroup.Item>
        ))}
      </ListGroup>
    </div>
  );
}

export default ScoutList; 