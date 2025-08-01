const mongoose = require('mongoose');

mongoose.connect('mongodb://127.0.0.1:27017/patientSystem', {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(()=>{
  console.log("Database Connected");
})

const db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', () => {
  console.log('Connected to MongoDB');
});

module.exports = db;