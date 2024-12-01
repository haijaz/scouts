import React, { useState } from 'react';
import { ListGroup, Form, Button, Modal } from 'react-bootstrap';

function ScoutList({ scouts, onAddScout, onSelectScout, selectedScout, onEditScout }) {
  const [newScoutName, setNewScoutName] = useState('');
  const [editingScout, setEditingScout] = useState(null);
  const [editName, setEditName] = useState('');
  const [showEditModal, setShowEditModal] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (newScoutName.trim()) {
      onAddScout(newScoutName.trim());
      setNewScoutName('');
    }
  };

  const handleEdit = (scout, e) => {
    e.stopPropagation(); // Prevent selecting the scout when clicking edit
    setEditingScout(scout);
    setEditName(scout.name);
    setShowEditModal(true);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (editName.trim() && editingScout) {
      await onEditScout(editingScout.id, editName.trim());
      setShowEditModal(false);
      setEditingScout(null);
      setEditName('');
    }
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
            className="d-flex justify-content-between align-items-center"
          >
            <div>{scout.name} - ${scout.balance.toFixed(2)}</div>
            <Button
              size="sm"
              variant={selectedScout?.id === scout.id ? "light" : "outline-primary"}
              onClick={(e) => handleEdit(scout, e)}
              style={{
                color: selectedScout?.id === scout.id ? '#0d6efd' : undefined,
                borderColor: selectedScout?.id === scout.id ? '#0d6efd' : undefined
              }}
            >
              Edit
            </Button>
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

      <Modal show={showEditModal} onHide={() => setShowEditModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Edit Scout Name</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form onSubmit={handleEditSubmit}>
            <Form.Group>
              <Form.Label>Scout Name</Form.Label>
              <Form.Control
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                required
              />
            </Form.Group>
            <div className="mt-3">
              <Button type="submit" variant="primary">
                Save Changes
              </Button>
            </div>
          </Form>
        </Modal.Body>
      </Modal>
    </div>
  );
}

export default ScoutList; 