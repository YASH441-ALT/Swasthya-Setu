const mongoose = require('mongoose');

const doctorSchema = new mongoose.Schema({
  username: String,
  password: String
});

const patientSchema = new mongoose.Schema({
  name: String,
  age: Number,
  gender: String,
  disease: String,
  doctor: String
});

const Doctor = mongoose.model('Doctor', doctorSchema);
const Patient = mongoose.model('Patient', patientSchema);

module.exports = { Doctor, Patient };
