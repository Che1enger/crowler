document.getElementById('fetchData').addEventListener('click', function() {
  fetch('/api/crowl.php')
      .then(response => response.json())
      .then(data => {
          displayResults(data);
          drawGraphs(data);
      })
      .catch(error => console.error('Error fetching data:', error));
});

function displayResults(data) {
  const resultsDiv = document.getElementById('results');
  resultsDiv.innerHTML = '';

  data.forEach(shop => {
      let shopDiv = document.createElement('div');
      shopDiv.innerHTML = `<h3>Shop: ${shop.url}</h3>`;

      let categoryTable = '<h4>Categories</h4><table><thead><tr><th>Category</th></tr></thead><tbody>';

      if (typeof shop.categories === 'object') {
          Object.values(shop.categories).forEach(category => {
              categoryTable += `<tr><td>${category.name}</td></tr>`;
          });
      } else {
          categoryTable += '<tr><td>Invalid category format</td></tr>';
      }

      categoryTable += '</tbody></table>';

      let productTable = '<h4>Products</h4><table><thead><tr><th>Product</th><th>Price</th><th>Discount</th></tr></thead><tbody>';

      if (Array.isArray(shop.products)) {
          if (shop.products.length > 0) {
              shop.products.forEach(product => {
                  productTable += `
                      <tr>
                          <td><a href="${product.url}" target="_blank">${product.name}</a></td>
                          <td>${product.price}</td>
                          <td>${product.discount ? product.discount : 'No Discount'}</td>
                      </tr>`;
              });
          } else {
              productTable += '<tr><td colspan="3">No products</td></tr>';
          }
      } else {
          productTable += '<tr><td colspan="3">Invalid product format</td></tr>';
      }

      productTable += '</tbody></table>';

      shopDiv.innerHTML += categoryTable + productTable;
      resultsDiv.appendChild(shopDiv);
  });
}

function drawGraphs(data) {
  const categoriesCount = {};
  const priceDistribution = {};
  const discountCount = {};

  function getRandomColor() {
      const letters = '0123456789ABCDEF';
      let color = '#';
      for (let i = 0; i < 6; i++) {
          color += letters[Math.floor(Math.random() * 16)];
      }
      return color;
  }

  data.forEach(shop => {
      const shopUrl = shop.url;
      categoriesCount[shopUrl] = shop.categories.length;

      shop.products.forEach(product => {
          const price = parseFloat(product.price.replace(/[^0-9.-]+/g, ""));
          if (price < 50) {
              priceDistribution['Under $50'] = (priceDistribution['Under $50'] || 0) + 1;
          } else if (price < 100) {
              priceDistribution['$50-$100'] = (priceDistribution['$50-$100'] || 0) + 1;
          } else {
              priceDistribution['Over $100'] = (priceDistribution['Over $100'] || 0) + 1;
          }

          if (product.discount !== null) {
              discountCount[shopUrl] = (discountCount[shopUrl] || 0) + 1;
          }
      });
  });

  const categoryLabels = Object.keys(categoriesCount);
  const categoryData = Object.values(categoriesCount);
  const categoryColors = categoryLabels.map(() => getRandomColor());

  const categoryChartCtx = document.getElementById('categoryChart').getContext('2d');
  new Chart(categoryChartCtx, {
      type: 'pie',
      data: {
          labels: categoryLabels,
          datasets: [{
              label: 'Number of Categories',
              data: categoryData,
              backgroundColor: categoryColors,
          }]
      },
      options: {
          scales: {
              y: {
                  beginAtZero: true
              }
          }
      }
  });

  const priceChartCtx = document.getElementById('priceChart').getContext('2d');
  new Chart(priceChartCtx, {
      type: 'bar',
      data: {
          labels: Object.keys(priceDistribution),
          datasets: [{
              label: 'Price Range',
              data: Object.values(priceDistribution),
              backgroundColor: '#36A2EB'
          }]
      }
  });

  const discountChartCtx = document.getElementById('discountChart').getContext('2d');
  new Chart(discountChartCtx, {
      type: 'bar',
      data: {
          labels: Object.keys(discountCount),
          datasets: [{
              label: 'Number of Discounted Products',
              data: Object.values(discountCount),
              backgroundColor: '#FF6384',
              borderColor: '#FF6384',
              borderWidth: 1
          }]
      },
      options: {
          scales: {
              y: {
                  beginAtZero: true
              }
          }
      }
  });
}
