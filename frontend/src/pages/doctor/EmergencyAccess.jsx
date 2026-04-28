import React, { useState, useEffect } from "react";
import { AiOutlineUserAdd, AiOutlineFileAdd } from "react-icons/ai";
import { FiLogOut } from "react-icons/fi";
import { toast } from "react-hot-toast";
//import { contract, web3 } from "../config/blockchain";

const DoctorDashboard = () => {
  const [patients, setPatients] = useState([]);
  const [recordHash, setRecordHash] = useState("");
  const [selectedPatient, setSelectedPatient] = useState("");

  // Fetch registered patients
  const fetchPatients = async () => {
    try {
      // Example: Loop through accounts and filter patients
      const accounts = await web3.eth.getAccounts();
      const patientList = [];
      for (let addr of accounts) {
        const user = await contract.methods.getUser(addr).call();
        if (parseInt(user[1]) === 0) { // Role.Patient = 0
          patientList.push({ address: addr, name: user[0] });
        }
      }
      setPatients(patientList);
    } catch (err) {
      console.error(err);
      toast.error("Failed to fetch patients.");
    }
  };

  useEffect(() => {
    fetchPatients();
  }, []);

  // Add medical record
  const addRecord = async () => {
    if (!selectedPatient || !recordHash) {
      toast.error("Select patient and provide record hash.");
      return;
    }
    try {
      const accounts = await web3.eth.getAccounts();
      await contract.methods
        .addRecord(selectedPatient, recordHash)
        .send({ from: accounts[0] });
      toast.success("Medical record added successfully!");
      setRecordHash("");
      setSelectedPatient("");
    } catch (err) {
      console.error(err);
      toast.error("Failed to add record.");
    }
  };

  return (
    <div className="p-6 bg-gray-100 min-h-screen">
      <h1 className="text-3xl font-bold mb-6 text-blue-700">
        Doctor Dashboard
      </h1>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="bg-white shadow rounded p-6 flex items-center space-x-4 hover:shadow-lg transition cursor-pointer">
          <AiOutlineUserAdd size={40} className="text-blue-600" />
          <div>
            <h2 className="text-lg font-semibold">Total Patients</h2>
            <p className="text-gray-500">{patients.length}</p>
          </div>
        </div>

        <div className="bg-white shadow rounded p-6 flex items-center space-x-4 hover:shadow-lg transition cursor-pointer">
          <AiOutlineFileAdd size={40} className="text-green-600" />
          <div>
            <h2 className="text-lg font-semibold">Add New Record</h2>
            <p className="text-gray-500">Upload IPFS hash of patient's record</p>
          </div>
        </div>
      </div>

      {/* Add Record Form */}
      <div className="bg-white shadow rounded p-6 mb-8">
        <h2 className="text-xl font-semibold mb-4 text-gray-700">
          Add Medical Record
        </h2>
        <div className="flex flex-col md:flex-row md:items-center md:space-x-4 space-y-4 md:space-y-0">
          <select
            className="border border-gray-300 rounded p-2 w-full md:w-1/3"
            value={selectedPatient}
            onChange={(e) => setSelectedPatient(e.target.value)}
          >
            <option value="">Select Patient</option>
            {patients.map((p, idx) => (
              <option key={idx} value={p.address}>
                {p.name} ({p.address.slice(0, 6)}...)
              </option>
            ))}
          </select>
          <input
            type="text"
            placeholder="IPFS Record Hash"
            value={recordHash}
            onChange={(e) => setRecordHash(e.target.value)}
            className="border border-gray-300 rounded p-2 w-full md:w-1/3"
          />
          <button
            onClick={addRecord}
            className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 transition"
          >
            Add Record
          </button>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white shadow rounded p-4 hover:shadow-lg transition">
          <h3 className="font-semibold text-gray-700">Recent Patients</h3>
          <ul className="mt-2 text-gray-500">
            {patients.slice(0, 5).map((p, idx) => (
              <li key={idx} className="border-b border-gray-200 py-1">
                {p.name} ({p.address.slice(0, 6)}...)
              </li>
            ))}
          </ul>
        </div>
        <div className="bg-white shadow rounded p-4 hover:shadow-lg transition">
          <h3 className="font-semibold text-gray-700">Notifications</h3>
          <ul className="mt-2 text-gray-500">
            <li className="border-b border-gray-200 py-1">New patient registered</li>
            <li className="border-b border-gray-200 py-1">Record added for John Doe</li>
            <li className="border-b border-gray-200 py-1">Patient updated profile</li>
          </ul>
        </div>
        <div className="bg-white shadow rounded p-4 hover:shadow-lg transition">
          <h3 className="font-semibold text-gray-700">Quick Actions</h3>
          <ul className="mt-2 text-gray-500 space-y-1">
            <li className="flex items-center space-x-2 cursor-pointer hover:text-blue-600 transition">
              <AiOutlineFileAdd /> Add Record
            </li>
            <li className="flex items-center space-x-2 cursor-pointer hover:text-red-600 transition">
              <FiLogOut /> Logout
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default DoctorDashboard;
