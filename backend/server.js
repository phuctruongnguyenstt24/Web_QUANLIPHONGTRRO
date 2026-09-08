const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// Kết nối MongoDB
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('Đã kết nối MongoDB'))
    .catch(err => console.error('Lỗi kết nối MongoDB:', err));

// Route test
app.get('/', (req, res) => {
    res.send('API quản lý phòng trọ đang chạy');
});
app.use('/api/users', require('./routes/Userroutes'));

const authRoutes = require('./routes/Authroutes');
app.use('/api/auth', authRoutes);

const roomRoutes = require('./routes/roomRoutes');
app.use('/api/rooms', roomRoutes);

app.use('/api/branches', require('./routes/branchRoutes'));

app.use('/api/invoices', require('./routes/Invoiceroute'));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server chạy tại http://localhost:${PORT}`));