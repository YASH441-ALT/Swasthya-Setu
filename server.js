require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const bodyParser = require('body-parser');
const path = require('path');
const fs = require('fs');

const app = express();

app.use(express.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));
app.use(express.static(path.join(__dirname, 'public')));

app.set('view engine', 'ejs');
app.set('views', __dirname);

app.use(session({
  secret: 'secret-key',
  resave: false,
  saveUninitialized: false
}));

const Doctor = require('./models').Doctor;
const Patient = require('./models').Patient;

const MONGO_URI = process.env.MONGO_URI;
const PORT = process.env.PORT || 3001;

mongoose.connect(MONGO_URI)
  .then(() => console.log('✅ MongoDB connected successfully!'))
  .catch(err => console.error('❌ MongoDB connection error:', err));

function isAuthenticated(req, res, next) {
  if (req.session.doctor) return next();
  res.redirect('/login.html');
}

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/public/home.html');
});

app.post('/signup', async (req, res) => {
  const { username, password } = req.body;
  const existingDoctor = await Doctor.findOne({ username });
  if (existingDoctor) return res.send('Username already exists');

  const doctor = new Doctor({ username, password });
  await doctor.save();
  res.redirect('/login.html');
});

app.post('/login', async (req, res) => {
  const { username, password } = req.body;
  const doctor = await Doctor.findOne({ username, password });
  if (!doctor) return res.json({ success: false });

  req.session.doctor = doctor;
  res.json({ success: true, username: doctor.username });
});

app.get('/doctor/:username/patients', isAuthenticated, async (req, res) => {
  const doctor = await Doctor.findOne({ username: req.params.username });
  if (!doctor) return res.send("Doctor not found");

  const patients = await Patient.find({ doctor: doctor.username });
  res.render('patients', { doctor, patients });
});

app.post('/add', isAuthenticated, async (req, res) => {
  try {
    const { name, age, disease } = req.body;

    const newPatient = new Patient({
      name,
      age,
      disease,
      doctor: req.session.doctor.username
    });

    await newPatient.save();

    const allPatients = await Patient.find({ doctor: req.session.doctor.username });
    const filePath = path.join(__dirname, "patient.json");
    fs.writeFileSync(filePath, JSON.stringify(allPatients, null, 2), "utf-8");

    res.status(200).json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: "Internal Server Error" });
  }
});

app.post('/edit/:id', isAuthenticated, async (req, res) => {
  const { name, age, gender, disease } = req.body;
  const updated = {};
  if (name) updated.name = name;
  if (age) updated.age = age;
  if (gender) updated.gender = gender;
  if (disease) updated.disease = disease;

  await Patient.findByIdAndUpdate(req.params.id, updated);
  res.redirect(`/doctor/${req.session.doctor.username}/patients`);
});

app.post('/delete/:id', isAuthenticated, async (req, res) => {
  await Patient.findByIdAndDelete(req.params.id);
  res.redirect(`/doctor/${req.session.doctor.username}/patients`);
});

app.get('/logout', (req, res) => {
  req.session.destroy(err => {
    if (err) return res.send("Error logging out");
    res.redirect('/logout.html');
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}/home.html`);
});
