const MongoClient = require('mongodb').MongoClient;

const url = 'mongodb://localhost:27017';
const client = new MongoClient(url);
const myDB = 'myDatabase';
const collectionComp = 'computer_components';

const express = require('express')
const bodyParser = require('body-parser')
const path = require('path');
const queryString = require('querystring');
const app = express()
const port = 3000
let compsCollection;

app.use(express.static(path.join(__dirname, '../public/pages')));
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
    htmlTable += '<tr><th>ID</th><th>Name</th><th>Supplier</th><th>Price</th><th>Units on Stock</th></tr>';
    computer_components.forEach(component => {
        htmlTable += `<tr><td style="text-align: center;">${component.id}</td>
                        <td>${component.name}</td>
                        <td>${component.supplier}</td>
                        <td style="text-align: center;">${component.price}$</td>
                        <td style="text-align: center;">${component.unitonstock}</td>
                    </tr>`;
    });
    htmlTable += '</table>'
    return htmlTable;
}

async function getNewID(client, dbName, collectionName) {
    const db = client.db(dbName);
    const collection = db.collection(collectionName);

    const lastestComp = await collection.find().sort({ id: -1 }).limit(1).toArray();
    if (lastestComp.length === 0) {
        return 1;
    } else {
        const lastID = lastestComp[0].id;
        const nextID = parseInt(lastID.replace("COMP", "")) + 1;
        return nextID;
    }
}

app.get('/', (req, res) => {
    res.sendFile(__dirname + '../public/pages/home.html')
});

app.post('/insert', async (req, res) => {
    try {
        await client.connect();

        compsCollection = client.db(myDB).collection(collectionComp);
        const newID = await getNewID(client, myDB, collectionComp);
        const newComps = req.body;
        const newCompsWithID = newComps.map(comp => {
            return {
                id: `COMP${newID}`,
                name: comp.name,
                supplier: comp.supplier,
                price: parseInt(comp.price),
                unitonstock: parseInt(comp.unitonstock)
            };
        });
        await compsCollection.insertMany(newCompsWithID);
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
        const find_minUnit = req.query.minUnit;
        const find_maxUnit = req.query.maxUnit
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

        if (find_minUnit && find_maxUnit) {
            query.unitonstock = { $gte: parseInt(find_minUnit), $lte: parseInt(find_maxUnit) };
        } else if (find_minUnit && !find_maxUnit) {
            query.unitonstock = { $gte: parseInt(find_minUnit) };
        } else if (!find_minUnit && find_maxUnit) {
            query.unitonstock = { $lte: parseInt(find_maxUnit) };
        }

        const result = await compsCollection.find(query).sort({ id: -1 }).toArray();
        if (result.length === 0) {
            res.send('Component not found!');
        } else {
            const htmlTable = outputComponents(result);
            res.send(htmlTable);
        }
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

    try {
        await client.connect();
        compsCollection = client.db(myDB).collection(collectionComp);

        const query = {};
        if (id) {
            query.id = { $regex: id, $options: 'i' }
        }
        if (name) {
            query.name = { $regex: name, $options: 'i' };
        }
        if (sup) {
            query.supplier = { $regex: sup, $options: 'i' };
        }

        const editComp = await compsCollection.findOne(query);

        if (!editComp) {
            const message = 'Component not found';
            res.send(message);
        }
        else {
            const queryParams = queryString.stringify(editComp);
            res.redirect(`/update.html?${queryParams}`);
        }
    }
    catch (error) {
        res.send(error)
    } finally {
        await client.close()
    }
})

app.put('/update', async (req, res) => {
    try {
        await client.connect();
        compsCollection = client.db(myDB).collection(collectionComp);

        const newComp = req.body;
        const update_id = newComp.id;
        const updateQuery = { $set: { name: newComp.name, supplier: newComp.supplier, price: parseInt(newComp.price), unitonstock: parseInt(newComp.unitonstock) } }

        await compsCollection.updateOne({ id: update_id }, updateQuery);
        const message = `Component with ID ${update_id} updated successfully.`
        res.json({ message: message });
    } catch (error) {
        res.send(error)
    }
    finally {
        await client.close();
    }
})

app.get('/readDelete', async (req, res) => {
    const delete_id = req.query.id;
    const delete_name = req.query.name;
    const delete_sup = req.query.supplier;
    try {
        await client.connect();
        compsCollection = client.db(myDB).collection(collectionComp);

        const query = {};
        if (delete_id) {
            query.id = { $regex: delete_id, $options: 'i' }
        }
        if (delete_name) {
            query.name = { $regex: delete_name, $options: 'i' };
        }
        if (delete_sup) {
            query.supplier = { $regex: delete_sup, $options: 'i' };
        }

        const result = await compsCollection.find(query).toArray();

        if (!result) {
            res.send("Component not found!");
        } else {
            const queryParams = new URLSearchParams({ results: JSON.stringify(result) }).toString();
            res.redirect(`/deleteHandler.html?${queryParams}`);
        }
    } catch (error) {
        res.send(error)
    }
    finally {
        await client.close();
    }
});

app.delete('/delete/:id', async (req, res) => {
    try {
        await client.connect();
        compsCollection = client.db(myDB).collection(collectionComp);

        const id = req.params.id;

        await compsCollection.deleteOne({ id: id });

        const message = `Component with ID: ${id} deleted successfully.`
        res.json({ message: message });
    } catch (error) {
        res.send(error)
    }
    finally {
        await client.close();
    }
})

app.delete('/deleteAll', async (req, res) => {
    try {
        await client.connect();
        compsCollection = client.db(myDB).collection(collectionComp);
        
        const deleted_comps = req.body;

        await compsCollection.deleteMany({ id: { $in: deleted_comps.map(comp => comp.id) } });

        const message = 'Delete all searched components successfully.';
        res.json({ message: message });
    } catch (error) {
        res.send(error)
    }
    finally {
        await client.close();
    }
})

app.listen(port, () => console.log(`Example app listening on port ${port}!`))