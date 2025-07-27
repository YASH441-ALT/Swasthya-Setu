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

mongoose.connect('mongodb://127.0.0.1:27017/patientDB', {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => console.log('MongoDB Connected'));

// Middleware to check login
function isAuthenticated(req, res, next) {
  if (req.session.doctor) return next();
  res.redirect('/login.html');
}

// Serve home
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/public/home.html');
});

// Signup route
app.post('/signup', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || username.length < 4) {
      return res.json({ success: false, message: 'Username must be at least 4 characters.' });
    }

    const passwordRegex = /^(?=.*[a-zA-Z])(?=.*\d)(?=.*[\W_]).{6,}$/;
    if (!password || !passwordRegex.test(password)) {
      return res.json({
        success: false,
        message: 'Password must be at least 6 characters, contain a special character and be alphanumeric.'
      });
    }

    const existing = await Doctor.findOne({ username });
    if (existing) {
      return res.json({ success: false, message: 'Username already exists' });
    }

    const newDoctor = new Doctor({ username, password });
    await newDoctor.save();

    req.session.doctor = newDoctor; // Auto-login after signup
    res.json({ success: true });

  } catch (err) {
    console.error("Signup Error:", err);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
});

// Login route
app.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.json({ success: false, message: "Missing credentials" });
    }

    const doctor = await Doctor.findOne({ username, password });
    if (!doctor) {
      return res.json({ success: false, message: "Invalid username or password" });
    }

    req.session.doctor = doctor;
    res.json({ success: true, username: doctor.username });

  } catch (err) {
    console.error("Login Error:", err);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
});

// Doctor-specific patient view
app.get('/doctor/:username/patients', isAuthenticated, async (req, res) => {
  const doctor = await Doctor.findOne({ username: req.params.username });
  if (!doctor) return res.send("Doctor not found");

  const patients = await Patient.find({ doctor: doctor.username });
  res.render('patients', { doctor, patients });
});

// Add patient
app.post('/add', isAuthenticated, async (req, res) => {
  try {
    const { name, age, disease } = req.body;
    const doctor = req.session.doctor.username;

    const newPatient = new Patient({ name, age, disease, doctor });
    await newPatient.save();

    const filePath = path.join(__dirname, 'patient.json');

    let patientList = [];
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath, 'utf-8');
      patientList = JSON.parse(data || '[]');
    }

    patientList.push({ name, age, disease, doctor });
    fs.writeFileSync(filePath, JSON.stringify(patientList, null, 2), 'utf-8');

    res.status(200).json({ success: true });

  } catch (err) {
    console.error("Add Patient Error:", err);
    res.status(500).json({ success: false, error: "Internal Server Error" });
  }
});

// Edit patient
app.post('/edit/:id', isAuthenticated, async (req, res) => {
  const { name, age, disease } = req.body;
  const updated = {};
  if (name) updated.name = name;
  if (age) updated.age = age;
  if (disease) updated.disease = disease;

  await Patient.findByIdAndUpdate(req.params.id, updated);
  res.redirect(`/doctor/${req.session.doctor.username}/patients`);
});

// Delete patient
app.post('/delete/:id', isAuthenticated, async (req, res) => {
  await Patient.findByIdAndDelete(req.params.id);
  res.redirect(`/doctor/${req.session.doctor.username}/patients`);
});

// Logout
app.get('/logout', (req, res) => {
  req.session.destroy(err => {
    if (err) return res.send("Error logging out");
    res.redirect('/logout.html');
  });
});

app.listen(3001, () => {
  console.log(`Server running at http://localhost:3001/home.html`);
});
