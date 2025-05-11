// Configuration
const TOP_SKILLS_COUNT = 15;
const HEATMAP_SKILLS_COUNT = 10;
const NETWORK_SKILLS_COUNT = 8;

// Global data storage
let vacanciesWithSkills = [];
let vacanciesEmpty = [];
let skillsData = [];

// 1. Enhanced Python-style array parser
function parsePythonArray(str) {
    if (!str || str === '[]' || str === 'None') return [];
    if (Array.isArray(str)) return str;
    
    try {
        const cleaned = String(str)
            .trim()
            .replace(/^\[|\]$/g, '')
            .replace(/'/g, '"')
            .replace(/\\"/g, '"')
            .replace(/""/g, '"')
            .replace(/\s*,\s*/g, ',')
            .replace(/\s*"\s*/g, '"');
        
        return cleaned ? JSON.parse(`[${cleaned}]`) : [];
    } catch (e) {
        console.warn(`Failed to parse skills string: "${str}"`, e);
        return [];
    }
}

// 2. Data loading functions
function loadCSV(url) {
    return new Promise((resolve) => {
        Papa.parse(url, {
            download: true,
            header: true,
            complete: (results) => resolve(results.data),
            error: (error) => {
                console.error("CSV load error:", error);
                resolve([]);
            }
        });
    });
}

async function loadJSON(url) {
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return await response.json();
    } catch (e) {
        console.error("JSON load error:", e);
        throw e;
    }
}

// 3. Visualization functions
function createAvailabilityChart() {
    const ctx = document.getElementById('availabilityChart').getContext('2d');
    new Chart(ctx, {
        type: 'pie',
        data: {
            labels: ['С указанием навыков', 'Без навыков'],
            datasets: [{
                data: [vacanciesWithSkills.length, vacanciesEmpty.length],
                backgroundColor: ['#ff71ce', '#01cdfe'],
                borderColor: '#ffffff',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    labels: {
                        color: 'white',
                        font: {
                            family: 'Courier New'
                        }
                    }
                },
                title: {
                    display: true,
                    text: 'Наличие указанных навыков',
                    color: 'white',
                    font: {
                        family: 'Courier New',
                        size: 16
                    }
                }
            }
        }
    });
}

function createTopSkillsChart() {
    const sortedSkills = [...skillsData].sort((a, b) => b.count - a.count);
    const topSkills = sortedSkills.slice(0, TOP_SKILLS_COUNT);
    
    const ctx = document.getElementById('topSkillsChart').getContext('2d');
    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: topSkills.map(skill => skill.skill),
            datasets: [{
                label: 'Количество упоминаний',
                data: topSkills.map(skill => skill.count),
                backgroundColor: '#9678ff',
                borderColor: '#ffffff',
                borderWidth: 1
            }]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            plugins: {
                title: {
                    display: true,
                    text: `Топ ${TOP_SKILLS_COUNT} востребованных навыков`,
                    color: 'white',
                    font: {
                        family: 'Courier New',
                        size: 16
                    }
                }
            },
            scales: {
                x: {
                    ticks: {
                        color: 'white',
                        font: {
                            family: 'Courier New'
                        }
                    },
                    grid: {
                        color: 'rgba(255, 255, 255, 0.1)'
                    }
                },
                y: {
                    ticks: {
                        color: 'white',
                        font: {
                            family: 'Courier New'
                        }
                    },
                    grid: {
                        color: 'rgba(255, 255, 255, 0.1)'
                    }
                }
            }
        }
    });
}

function createSkillHeatmap() {
    const container = document.getElementById('heatmapContainer');
    container.innerHTML = '';
    
    try {
        const topSkills = [...skillsData]
            .sort((a, b) => b.count - a.count)
            .slice(0, HEATMAP_SKILLS_COUNT)
            .map(skill => skill.skill);
        
        // Create co-occurrence matrix
        const matrix = Array(HEATMAP_SKILLS_COUNT).fill()
            .map(() => Array(HEATMAP_SKILLS_COUNT).fill(0));
        
        vacanciesWithSkills.forEach(vacancy => {
            const skills = Array.isArray(vacancy.skills) ? vacancy.skills : [];
            topSkills.forEach((skill1, i) => {
                if (skills.includes(skill1)) {
                    topSkills.forEach((skill2, j) => {
                        if (skills.includes(skill2)) {
                            matrix[i][j]++;
                        }
                    });
                }
            });
        });
        
        const width = Math.min(500, container.clientWidth);
        const height = width;
        const cellSize = width / HEATMAP_SKILLS_COUNT;
        
        const svg = d3.select(container)
            .append('svg')
            .attr('width', width)
            .attr('height', height);
        
        const colorScale = d3.scaleLinear()
            .domain([0, 0.5, 1])
            .range(['#171738', '#ff71ce', '#01cdfe']);
        
        // Draw heatmap cells
        svg.selectAll()
            .data(matrix.flat())
            .enter()
            .append('rect')
            .attr('x', (d, i) => (i % HEATMAP_SKILLS_COUNT) * cellSize)
            .attr('y', (d, i) => Math.floor(i / HEATMAP_SKILLS_COUNT) * cellSize)
            .attr('width', cellSize)
            .attr('height', cellSize)
            .attr('fill', d => colorScale(d / Math.max(...matrix.flat())))
            .attr('stroke', 'white')
            .attr('stroke-width', 0.5)
            .append('title')
            .text((d, i) => {
                const row = Math.floor(i / HEATMAP_SKILLS_COUNT);
                const col = i % HEATMAP_SKILLS_COUNT;
                return `${topSkills[row]} + ${topSkills[col]}: ${d} совпадений`;
            });
        
        // Add labels
        // topSkills.forEach((skill, i) => {
        //     svg.append('text')
        //         .attr('x', i * cellSize + cellSize / 2)
        //         .attr('y', height - 5)
        //         .attr('text-anchor', 'middle')
        //         .attr('font-family', 'Courier New')
        //         .attr('font-size', '10px')
        //         .attr('fill', 'white')
        //         .text(skill.length > 10 ? skill.substring(0, 8) + '...' : skill)
        //         .attr('transform', `rotate(-45, ${i * cellSize + cellSize / 2}, ${height - 5})`);
        //     
        //     svg.append('text')
        //         .attr('x', 5)
        //         .attr('y', i * cellSize + cellSize / 2 + 5)
        //         .attr('text-anchor', 'start')
        //         .attr('font-family', 'Courier New')
        //         .attr('font-size', '10px')
        //         .attr('fill', 'white')
        //         .text(skill.length > 10 ? skill.substring(0, 8) + '...' : skill);
        // });
        
    } catch (e) {
        console.error("Heatmap error:", e);
        container.innerHTML = '<p class="error">Ошибка создания тепловой карты</p>';
    }
}

function createSkillNetwork() {
    const container = document.getElementById('networkContainer');
    container.innerHTML = '';
    
    try {
        const topSkills = [...skillsData]
            .sort((a, b) => b.count - a.count)
            .slice(0, NETWORK_SKILLS_COUNT)
            .map(skill => skill.skill);
        
        const nodes = topSkills.map(skill => ({ 
            id: skill,
            count: skillsData.find(s => s.skill === skill)?.count || 0 
        }));
        
        const links = [];
        for (let i = 0; i < topSkills.length; i++) {
            for (let j = i + 1; j < topSkills.length; j++) {
                const skill1 = topSkills[i];
                const skill2 = topSkills[j];
                let count = 0;
                
                vacanciesWithSkills.forEach(vacancy => {
                    const skills = Array.isArray(vacancy.skills) ? vacancy.skills : [];
                    if (skills.includes(skill1) && skills.includes(skill2)) {
                        count++;
                    }
                });
                
                if (count > 0) {
                    links.push({
                        source: skill1,
                        target: skill2,
                        value: count
                    });
                }
            }
        }
        
        const width = Math.min(500, container.clientWidth);
        const height = width;
        
        const svg = d3.select(container)
            .append('svg')
            .attr('width', width)
            .attr('height', height);
        
        const simulation = d3.forceSimulation(nodes)
            .force('link', d3.forceLink(links).id(d => d.id).distance(100))
            .force('charge', d3.forceManyBody().strength(-200))
            .force('center', d3.forceCenter(width / 2, height / 2));
        
        const link = svg.append('g')
            .selectAll('line')
            .data(links)
            .enter()
            .append('line')
            .attr('stroke', '#ff71ce')
            .attr('stroke-width', d => Math.sqrt(d.value));
        
        const node = svg.append('g')
            .selectAll('g')
            .data(nodes)
            .enter()
            .append('g')
            .call(d3.drag()
                .on('start', dragstarted)
                .on('drag', dragged)
                .on('end', dragended));
        
        node.append('circle')
            .attr('r', d => 10 + (d.count / 20))
            .attr('fill', '#01cdfe')
            .attr('stroke', 'white');
        
        node.append('text')
            .attr('dy', 4)
            .attr('text-anchor', 'middle')
            .attr('font-family', 'Courier New')
            .attr('font-size', '10px')
            .attr('fill', 'white')
            .text(d => d.id.length > 8 ? d.id.substring(0, 6) + '...' : d.id);
        
        simulation.on('tick', () => {
            link
                .attr('x1', d => d.source.x)
                .attr('y1', d => d.source.y)
                .attr('x2', d => d.target.x)
                .attr('y2', d => d.target.y);
            
            node
                .attr('transform', d => `translate(${d.x},${d.y})`);
        });
        
        function dragstarted(event, d) {
            if (!event.active) simulation.alphaTarget(0.3).restart();
            d.fx = d.x;
            d.fy = d.y;
        }
        
        function dragged(event, d) {
            d.fx = event.x;
            d.fy = event.y;
        }
        
        function dragended(event, d) {
            if (!event.active) simulation.alphaTarget(0);
            d.fx = null;
            d.fy = null;
        }
        
    } catch (e) {
        console.error("Network error:", e);
        container.innerHTML = '<p class="error">Ошибка создания сети навыков</p>';
    }
}

// 4. Initialize the dashboard
async function initializeDashboard() {
    try {
        const [withSkills, empty, skills] = await Promise.all([
            loadCSV('data/vacancies_with_skills_merged.csv'),
            loadCSV('data/vacancies_empty_merged.csv'),
            loadJSON('data/skills_data_merged.json')
        ]);
        
        vacanciesWithSkills = withSkills.map(v => ({
            ...v,
            skills: parsePythonArray(v.skills)
        }));
        
        vacanciesEmpty = empty;
        skillsData = skills;
        
        document.getElementById('totalCount').textContent = 
            vacanciesWithSkills.length + vacanciesEmpty.length;
        
        createAvailabilityChart();
        createTopSkillsChart();
        createSkillHeatmap();
        createSkillNetwork();
        
        animateCPUUsage();
        
    } catch (error) {
        console.error("Initialization error:", error);
        document.getElementById('heatmapContainer').innerHTML = 
            '<p class="error">Ошибка загрузки данных</p>';
        document.getElementById('networkContainer').innerHTML = 
            '<p class="error">Ошибка загрузки данных</p>';
    }
}

// 5. Helper functions
function animateCPUUsage() {
    const levels = ['▱▱▱▱▱ 0%', '▰▱▱▱▱ 21%', '▰▰▱▱▱ 42%', '▰▰▰▱▱ 63%', '▰▰▰▰▱ 84%', '▰▰▰▰▰ 100%'];
    let currentLevel = 2;
    const cpuElement = document.getElementById('cpuUsage');
    
    setInterval(() => {
        currentLevel = (currentLevel + 1) % levels.length;
        cpuElement.textContent = levels[currentLevel];
    }, 3000);
}

// Start the dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', initializeDashboard);
