const MongoClient = require('mongodb').MongoClient;

const url = 'mongodb://localhost:27017';
const client = new MongoClient(url);
const myDB = 'myDatabase';
const collectionComp = 'computer_components';

const express = require('express')
const bodyParser = require('body-parser')
const path = require('path');
const queryString = require('querystring')
const app = express()
const port = 3000
let compsCollection;

app.use(express.static(path.join(__dirname, '/pages')));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

function outputComponents(computer_components) {
    let htmlTable = ``
    htmlTable += `<style>
                        table {
                            border-collapse: collapse;
                            width: 100%;
                        }
                        th, td {
                            border: 1.2px solid #dddddd;
                            padding: 8px;
                        }
                        th {
                            background-color: #bebebe;
                            text-align: center;
                        }
                    </style>`
    htmlTable += '<table border="1">';
    htmlTable += '<tr><th>ID</th><th>Name</th><th>Supplier</th><th>Price</th><th>Units on Stock</th><th>Image</th></tr>';
    computer_components.forEach(component => {
        htmlTable += `<tr><td style="text-align: center;">${component.id}</td>
                        <td>${component.name}</td>
                        <td>${component.supplier}</td>
                        <td style="text-align: center;">${component.price}$</td>
                        <td style="text-align: center;">${component.unitonstock}</td>
                        <td style="text-align: center;"><img src="/${component.image}" alt="" width = 80px></td>
                    </tr>`;
    });
    htmlTable += '</table>'
    return htmlTable;
}

function getNewID(list_comps) {
    let maxID = 0;

    for (let i = 0; i < list_comps.length; i++) {
        const componentID = parseInt(list_comps[i].id.substring(4))
        if (componentID > maxID) {
            maxID = componentID
        }
    }
    const newID = 'COMP' + String(maxID + 1).padStart(4, '0')
    return newID;
}

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/pages/home.html')
});

// create new component
app.post('/insert', async (req, res) => {
    try {
        await client.connect();

        compsCollection = client.db(myDB).collection(collectionComp);
        // const newID = getNewID(components);
        const newComps = req.body;

        await compsCollection.insertMany(newComps);
        const message = `${newComps.length} components is added successfully`;

        res.json({ message: message });
    } catch (error) {
        res.send(error)
    }
    finally {
        await client.close();
    }
})

app.get('/read', async (req, res) => {
    try {
        const find_name = req.query.name;
        const find_sup = req.query.supplier;
        const find_minPrice = req.query.minPrice;
        const find_maxPrice = req.query.maxPrice;
        const query = {};

        await client.connect();
        compsCollection = client.db(myDB).collection(collectionComp);

        if (find_name) {
            query.name = { $regex: find_name, $options: 'i' };
        }

        if (find_sup) {
            query.supplier = { $regex: find_sup, $options: 'i' };
        }

        if (find_minPrice && find_maxPrice) {
            query.price = { $gte: parseInt(find_minPrice), $lte: parseInt(find_maxPrice) };
        } else if (find_minPrice && !find_maxPrice) {
            query.price = { $gte: parseInt(find_minPrice) };
        } else if (!find_minPrice && find_maxPrice) {
            query.price = { $lte: parseInt(find_maxPrice) };
        }
        const result = await compsCollection.find(query).toArray();
        const htmlTable = outputComponents(result);
        res.send(htmlTable);
    } catch (error) {
        res.send(error)
    }
    finally {
        await client.close()
    }
})

app.get('/read/update', async (req, res) => {
    const id = req.query.id;
    const name = req.query.name;
    const sup = req.query.supplier;
    const query = { id: { $regex: id, $options: 'i' } }
    try {
        await client.connect();
        compsCollection = client.db(myDB).collection(collectionComp);

        editComp = await compsCollection.findOne(query);

        const queryParams = queryString.stringify(editComp);
        res.redirect(`/pages/update.html?${queryParams}`);
    }
    catch (error) {
        res.send(error)
    } finally {
        await client.close()
    }
})

app.get('/update', async (req, res) => {
    try {
        await client.connect();
        compsCollection = client.db(myDB).collection(collectionComp);

        const newComp = req.body;
        const update_id = newComp.id;
        const updateQuery = { $set: { name: newComp.name, supplier: newComp.supplier, price: newComp.price, unitonstock: newComp.unitonstock } }

        await compsCollection.updateOne({ id: update_id }, updateQuery);
        const message = `Component with ID ${update_id} updated successfully.`
        res.json({message: message});
    } catch (error) {
        res.send(error)
    }
    finally {
        await client.close();
    }
})

// delete component by name
app.get('/delete/:name', async (req, res) => {
    delete_name = req.params.name
    try {
        await client.connect();

        compsCollection = client.db(myDB).collection(collectionComp);
        await compsCollection.deleteMany({ name: delete_name });

        res.send(`Component ${componentName} has been deleted successfully.`);
    } catch (error) {
        res.send(error)
    }
    finally {
        await client.close();
    }
});

app.listen(port, () => console.log(`Example app listening on port ${port}!`))