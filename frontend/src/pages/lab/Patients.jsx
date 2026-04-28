import React, { useState, useEffect } from 'react';

const Patients = ({ token }) => {
  const [patients, setPatients] = useState([]);
  const [filteredPatients, setFilteredPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const fetchPatients = async () => {
      try {
        const response = await fetch('http://localhost:5000/api/labs/patients', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            setPatients(data.data);
            setFilteredPatients(data.data);
          } else {
            setError(data.message || 'Failed to fetch patients');
          }
        } else {
          setError('Failed to fetch patients');
        }
      } catch (err) {
        setError('Network error while fetching patients');
      } finally {
        setLoading(false);
      }
    };

    fetchPatients();
  }, [token]);

  useEffect(() => {
    const results = patients.filter(patient =>
      patient.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      patient.email.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredPatients(results);
  }, [searchTerm, patients]);

  if (loading) return <div className="loading">Loading patients...</div>;
  if (error) return <div className="error-message">{error}</div>;

  return (
    <div className="patients-section">
      <h2>Patient Management</h2>
      <div className="search-bar">
        <input
          type="text"
          placeholder="Search by name or email..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>
      {filteredPatients.length > 0 ? (
        <table className="patients-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
            </tr>
          </thead>
          <tbody>
            {filteredPatients.map((patient) => (
              <tr key={patient._id}>
                <td>{patient.name}</td>
                <td>{patient.email}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p className="no-data">No patients found.</p>
      )}
    </div>
  );
};

export default Patients;
