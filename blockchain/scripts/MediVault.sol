// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract MediVault {

    // Roles
    enum Role { Patient, Doctor, Insurance, Lab }

    struct User {
        bytes32 name;       // changed from string to bytes32
        Role role;
        address userAddress;
    }

    struct MedicalRecord {
        bytes32 patientName; // changed from string to bytes32
        bytes32 doctorName;  // changed from string to bytes32
        string recordHash;   // keep string for IPFS hash
        uint256 timestamp;
    }

    // Mappings
    mapping(address => User) public users;
    mapping(address => MedicalRecord[]) private records;

    // Events
    event UserRegistered(address indexed userAddress, bytes32 name, Role role);
    event RecordAdded(address indexed patient, bytes32 doctorName, string recordHash, uint256 timestamp);

    // --- Helper functions to convert string <-> bytes32 ---
    function stringToBytes32(string memory source) public pure returns (bytes32 result) {
        bytes memory temp = bytes(source);
        if (temp.length == 0) return 0x0;
        assembly {
            result := mload(add(source, 32))
        }
    }

    function bytes32ToString(bytes32 source) public pure returns (string memory) {
        bytes memory tempBytes = new bytes(32);
        assembly {
            mstore(add(tempBytes, 32), source)
        }
        // find null terminator
        uint256 length = 0;
        while(length < 32 && tempBytes[length] != 0) {
            length++;
        }
        bytes memory bytesString = new bytes(length);
        for(uint i = 0; i < length; i++) {
            bytesString[i] = tempBytes[i];
        }
        return string(bytesString);
    }

    // --- Register a user ---
    function registerUser(string memory _name, uint8 _role) public {
        require(_role <= uint8(Role.Lab), "Invalid role");
        require(users[msg.sender].userAddress == address(0), "User already registered");

        bytes32 nameBytes = stringToBytes32(_name);

        users[msg.sender] = User({
            name: nameBytes,
            role: Role(_role),
            userAddress: msg.sender
        });

        emit UserRegistered(msg.sender, nameBytes, Role(_role));
    }

    // --- Add a medical record (only doctor) ---
    function addRecord(address _patient, string memory _recordHash) public {
        require(users[msg.sender].userAddress != address(0), "Doctor not registered");
        require(users[msg.sender].role == Role.Doctor, "Only doctor can add records");
        require(users[_patient].userAddress != address(0), "Patient not registered");

        MedicalRecord memory newRecord = MedicalRecord({
            patientName: users[_patient].name,
            doctorName: users[msg.sender].name,
            recordHash: _recordHash,
            timestamp: block.timestamp
        });

        records[_patient].push(newRecord);

        emit RecordAdded(_patient, users[msg.sender].name, _recordHash, block.timestamp);
    }

    // --- Get all records of a patient ---
    function getRecords(address _patient) public view returns (MedicalRecord[] memory) {
        require(users[_patient].userAddress != address(0), "Patient not registered");
        return records[_patient];
    }

    // --- Get user info ---
    function getUser(address _user) public view returns (string memory, Role, address) {
        require(users[_user].userAddress != address(0), "User not registered");
        User memory u = users[_user];
        return (bytes32ToString(u.name), u.role, u.userAddress);
    }
}