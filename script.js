let db;

document.addEventListener('DOMContentLoaded', () => {
    let request = indexedDB.open('shreejiSalesDB', 1);

    request.onerror = (event) => {
        console.error('Database error:', event.target.errorCode);
    };

    request.onsuccess = (event) => {
        db = event.target.result;
        displayProducts();
    };

    request.onupgradeneeded = (event) => {
        db = event.target.result;
        let objectStore = db.createObjectStore('products', { keyPath: 'name' });
        objectStore.createIndex('name', 'name', { unique: true });
    };
});

function addProduct() {
    const productName = document.getElementById('product').value;
    const quantityAdded = parseInt(document.getElementById('quantity').value);
    
    
    if (productName === '' || isNaN(quantityAdded) || quantityAdded <= 0) {
        alert('Please enter valid product name and quantity.');
        return;
    }
    
    const date = new Date().toLocaleString(); 

    let transaction = db.transaction(['products'], 'readwrite');
    let objectStore = transaction.objectStore('products');
    let request = objectStore.get(productName);

    request.onerror = (event) => {
        console.error('Error getting product:', event.target.errorCode);
    };

    request.onsuccess = (event) => {
        let data = event.target.result;

        if (data) {
            data.quantity += quantityAdded;
            data.history.push({ action: 'add', quantity: quantityAdded, date });
        } else {
            data = {
                name: productName,
                quantity: quantityAdded,
                sold: 0,
                history: [{ action: 'add', quantity: quantityAdded, date }]
            };
        }

        let requestUpdate = objectStore.put(data);
        requestUpdate.onerror = (event) => {
            console.error('Error updating product:', event.target.errorCode);
        };
        requestUpdate.onsuccess = (event) => {
            displayProducts();
        };
    };

    // Example: Displaying the date and time in the product list
    const productList = document.getElementById('productList');
    const li = document.createElement('li');
    li.textContent = `${productName}: Added ${quantityAdded} at ${date}`;
    productList.appendChild(li);


    document.getElementById('product').value = '';
    document.getElementById('quantity').value = '';
}

function sellProduct() {
    const productName = document.getElementById('soldProduct').value;
    const quantitySold = parseInt(document.getElementById('quantitySold').value);
    const date = new Date().toLocaleString();

    if (productName === '' || isNaN(quantitySold) || quantitySold <= 0) {
        alert('Please enter valid product name and quantity sold.');
        return;
    }

    let transaction = db.transaction(['products'], 'readwrite');
    let objectStore = transaction.objectStore('products');
    let request = objectStore.get(productName);

    request.onerror = (event) => {
        console.error('Error getting product:', event.target.errorCode);
    };

    request.onsuccess = (event) => {
        let data = event.target.result;

        if (data) {
            if (quantitySold > data.quantity - data.sold) {
                alert('Not enough stock to sell.');
                return;
            }
            data.sold += quantitySold;
            data.history.push({ action: 'sell', quantity: quantitySold, date });

            let requestUpdate = objectStore.put(data);
            requestUpdate.onerror = (event) => {
                console.error('Error updating product:', event.target.errorCode);
            };
            requestUpdate.onsuccess = (event) => {
                displayProducts();
            };
        } else {
            alert('Product not found.');
            return;
        }
    };

    document.getElementById('soldProduct').value = '';
    document.getElementById('quantitySold').value = '';
}

function displayProducts() {
    const productList = document.getElementById('productList');
    productList.innerHTML = '';

    let transaction = db.transaction(['products'], 'readonly');
    let objectStore = transaction.objectStore('products');

    objectStore.openCursor().onsuccess = (event) => {
        let cursor = event.target.result;
        if (cursor) {
            const product = cursor.value;
            const li = document.createElement('li');
            li.textContent = `${product.name}: ${product.quantity - product.sold} (Total: ${product.quantity}, Sold: ${product.sold})`;
            productList.appendChild(li);
            cursor.continue();
        }
    };
}

function calculateRemainingStock() {
    const remainingStockList = document.getElementById('remainingStockList');
    remainingStockList.innerHTML = '';

    let transaction = db.transaction(['products'], 'readonly');
    let objectStore = transaction.objectStore('products');

    objectStore.openCursor().onsuccess = (event) => {
        let cursor = event.target.result;
        if (cursor) {
            const product = cursor.value;
            const li = document.createElement('li');
            li.textContent = `${product.name}: ${product.quantity - product.sold}`;
            remainingStockList.appendChild(li);
            cursor.continue();
        }
    };
}

// Function to reset all input fields and clear product list and stock summary
function resetAll() {
    // Clear input fields
    document.getElementById('product').value = '';
    document.getElementById('quantity').value = '';
    document.getElementById('soldProduct').value = '';
    document.getElementById('quantitySold').value = '';

    // Clear product list
    const productList = document.getElementById('productList');
    productList.innerHTML = '';

    // Clear stock summary
    const remainingStockList = document.getElementById('remainingStockList');
    remainingStockList.innerHTML = '';

    // Ensure any event listeners or dynamic content functions are reset or cleared
    // For example, if you have event listeners that populate the product list or stock summary,
    // remove or reset them here as needed.
}


 
function downloadReport() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    const reportDate = new Date().toLocaleString();

    doc.text("Shreeji Sales Corporation - Product Stock Report", 20, 20);
    doc.text(`Report Generated on: ${reportDate}`, 20, 30);
    let y = 40;

    let transaction = db.transaction(['products'], 'readonly');
    let objectStore = transaction.objectStore('products');

    objectStore.openCursor().onsuccess = (event) => {
        let cursor = event.target.result;
        if (cursor) {
            const product = cursor.value;
            doc.text(`${product.name}: ${product.quantity - product.sold} (Total: ${product.quantity}, Sold: ${product.sold})`, 20, y);
            y += 10;
            doc.text("History:", 20, y);
            y += 10;
            product.history.forEach(record => {
                doc.text(`Action: ${record.action}, Quantity: ${record.quantity}, Date: ${record.date}`, 30, y);
                y += 10;
            });
            y += 10;
            cursor.continue();
        }
        if (!cursor) {
            doc.save(`Product_Stock_Report_${reportDate}.pdf`);
        }
    };
}
