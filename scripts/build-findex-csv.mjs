import fs from 'node:fs';

const countries = [
  ['USA', 'United States'],
  ['GBR', 'United Kingdom'],
  ['DEU', 'Germany'],
  ['IND', 'India'],
  ['KEN', 'Kenya'],
  ['FRA', 'France'],
  ['CAN', 'Canada'],
  ['JPN', 'Japan'],
  ['SGP', 'Singapore'],
  ['BRA', 'Brazil'],
  ['AUS', 'Australia'],
  ['NGA', 'Nigeria']
];

const indicators = [
  ['account.t.d', '% of population age 15+'],
  ['g20.any', '% of population age 15+'],
  ['fin2.t.d', '% of population age 15+'],
  ['fin10', '% of population age 15+'],
  ['g20.made', '% of population age 15+']
];

async function pull() {
  const lines = ['country_code,country_name,indicator_code,year,value,unit,source_url,target_population,survey_breakdown'];
  for (const [code, name] of countries) {
    for (const [ind, unit] of indicators) {
      const url = `https://api.worldbank.org/v2/country/${code}/indicator/${ind}?source=28&date=2017:2024&format=json`;
      try {
        const res = await fetch(url);
        const data = await res.json();
        const items = data[1] || [];
        for (const item of items) {
          const yr = item.date;
          if (['2017', '2021', '2024'].includes(yr)) {
            const val = (item.value !== null && item.value !== undefined) ? Number(item.value).toFixed(1) : '';
            lines.push(`${code},"${name}",${ind},${yr},${val},"${unit}",https://databank.worldbank.org/source/global-financial-inclusion,"Adults age 15+","Nationally representative survey sample (Gallup World Poll)"`);
          }
        }
      } catch (err) {
        console.error(code, ind, err.message);
      }
    }
  }
  fs.writeFileSync('data/global-findex-data.csv', lines.join('\n'));
  console.log('Saved lines to data/global-findex-data.csv:', lines.length);
}

pull();
