const express = require('express');
const cors = require('cors');


const port = process.env.PORT || 5000;

const app = express();

//middle ware

app.use(cors());
app.use(express.json());


app.get('/', (req, res) => {
    res.send('BD-Store server is running.')
});

app.listen(port, () => {
    console.log(`BD-Store running on ${port}`);
})