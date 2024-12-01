import React, { useState, useEffect } from 'react';
import { Container, Tab, Tabs, Alert } from 'react-bootstrap';
import UserManagement from './UserManagement';

function UserManagementPage({ token }) {
  const [auditLogs, setAuditLogs] = useState([]);
  const [error, setError] = useState(null);

  const fetchAuditLogs = async () => {
    try {
      const response = await fetch('http://localhost:3000/api/audit-logs', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!response.ok) throw new Error('Failed to fetch audit logs');
      const data = await response.json();
      setAuditLogs(data);
    } catch (err) {
      setError('Failed to load audit logs');
    }
  };

  useEffect(() => {
    fetchAuditLogs();
  }, [token]);

  return (
    <Container>
      <h2 className="mb-4">Administration</h2>
      {error && <Alert variant="danger">{error}</Alert>}
      
      <Tabs defaultActiveKey="users" className="mb-4">
        <Tab eventKey="users" title="User Management">
          <UserManagement token={token} />
        </Tab>
        <Tab eventKey="audit" title="Audit History">
          <div className="mt-4">
            <h3>Audit Logs</h3>
            <table className="table table-striped">
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>User</th>
                  <th>Action</th>
                  <th>Details</th>
                </tr>
              </thead>
              <tbody>
                {auditLogs.map(log => (
                  <tr key={log.id}>
                    <td>{new Date(log.timestamp).toLocaleString()}</td>
                    <td>{log.username}</td>
                    <td>{log.action_type}</td>
                    <td>{log.action_details}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Tab>
      </Tabs>
    </Container>
  );
}

export default UserManagementPage; 