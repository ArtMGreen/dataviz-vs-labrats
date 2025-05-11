// Configuration
const TOP_SKILLS_COUNT = 15;
const HEATMAP_SKILLS_COUNT = 10;
const NETWORK_SKILLS_COUNT = 8;

// Global data storage
let vacanciesWithSkills = [];
let vacanciesEmpty = [];
let skillsData = [];

function parsePythonArray(str) {
    if (!str || str === '[]') return [];
    if (Array.isArray(str)) return str;
    
    try {
        // Convert Python-style quotes to JSON-standard
        const jsonCompatible = str
            .replace(/'/g, '"')  // Replace single quotes with double quotes
            .replace(/^\[|\]$/g, '');  // Remove brackets
        
        // Parse as JSON array
        return JSON.parse(`[${jsonCompatible}]`);
    } catch (e) {
        console.warn(`Failed to parse skills string: "${str}"`, e);
        return [];
    }
}

Promise.all([
    loadCSV('data/vacancies_with_skills_merged.csv'),
    loadCSV('data/vacancies_empty_merged.csv'),
    loadJSON('data/skills_data_merged.json')
]).then(([withSkills, empty, skills]) => {
    // Process skills in vacancies data
    vacanciesWithSkills = withSkills.map(v => ({
        ...v,
        skills: parsePythonArray(v.skills)
    }));
    
    vacanciesEmpty = empty;
    skillsData = skills;
    
    console.log("First vacancy skills sample:", vacanciesWithSkills[0].skills);
    
    document.getElementById('totalCount').textContent = 
        vacanciesWithSkills.length + vacanciesEmpty.length;
    
    createAvailabilityChart();
    createTopSkillsChart();
    createSkillHeatmap();
    createSkillNetwork();
    
    animateCPUUsage();
}).catch(error => {
    console.error("Error loading data:", error);
    alert("Error loading data. Check console for details.");
});

function loadCSV(url) {
    return new Promise((resolve, reject) => {
        Papa.parse(url, {
            download: true,
            header: true,
            complete: (results) => resolve(results.data),
            error: (error) => reject(error)
        });
    });
}

function loadJSON(url) {
    return fetch(url)
        .then(response => {
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            return response.json();
        });
}

// Chart 1: Availability Pie Chart
function createAvailabilityChart() {
    const ctx = document.getElementById('availabilityChart').getContext('2d');
    new Chart(ctx, {
        type: 'pie',
        data: {
            labels: ['With Skills', 'Empty'],
            datasets: [{
                data: [vacanciesWithSkills.length, vacanciesEmpty.length],
                backgroundColor: [
                    'rgba(255, 113, 206, 0.8)',
                    'rgba(1, 205, 254, 0.8)'
                ],
                borderColor: [
                    'rgba(255, 255, 255, 1)',
                    'rgba(255, 255, 255, 1)'
                ],
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: 'right',
                    labels: {
                        color: 'white',
                        font: {
                            family: 'Courier New'
                        }
                    }
                },
                title: {
                    display: true,
                    text: 'Skills Availability in Vacancies',
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

// Chart 2: Top Skills Bar Chart
function createTopSkillsChart() {
    // Sort skills by count and take top X
    const sortedSkills = [...skillsData].sort((a, b) => b.count - a.count);
    const topSkills = sortedSkills.slice(0, TOP_SKILLS_COUNT);
    
    const ctx = document.getElementById('topSkillsChart').getContext('2d');
    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: topSkills.map(skill => skill.skill),
            datasets: [{
                label: 'Number of Mentions',
                data: topSkills.map(skill => skill.count),
                backgroundColor: 'rgba(150, 120, 255, 0.8)',
                borderColor: 'rgba(255, 255, 255, 1)',
                borderWidth: 1
            }]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            plugins: {
                legend: {
                    display: false
                },
                title: {
                    display: true,
                    text: `Top ${TOP_SKILLS_COUNT} Most Demanded Skills`,
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

// Chart 3A: Skill Heatmap
function createSkillHeatmap() {
    const topSkills = [...skillsData]
        .sort((a, b) => b.count - a.count)
        .slice(0, HEATMAP_SKILLS_COUNT)
        .map(skill => skill.skill);
    
    // Create co-occurrence matrix
    const matrix = Array(HEATMAP_SKILLS_COUNT).fill()
        .map(() => Array(HEATMAP_SKILLS_COUNT).fill(0));
    
    vacanciesWithSkills.forEach(vacancy => {
        const vacancySkills = vacancy.skills ? JSON.parse(vacancy.skills) : [];
        
        topSkills.forEach((skill1, i) => {
            if (vacancySkills.includes(skill1)) {
                topSkills.forEach((skill2, j) => {
                    if (vacancySkills.includes(skill2)) {
                        matrix[i][j]++;
                    }
                });
            }
        });
    });
    
    // Normalize matrix (for coloring)
    const maxVal = Math.max(...matrix.flat());
    const normalizedMatrix = matrix.map(row => 
        row.map(val => val / maxVal)
    );
    
    // Create heatmap with D3
    const container = document.getElementById('heatmapContainer');
    container.innerHTML = '';
    
    const width = 500;
    const height = 500;
    const cellSize = width / HEATMAP_SKILLS_COUNT;
    
    const svg = d3.select(container)
        .append('svg')
        .attr('width', width)
        .attr('height', height);
    
    // Create color scale
    const colorScale = d3.scaleLinear()
        .domain([0, 0.5, 1])
        .range(['#171738', '#ff71ce', '#01cdfe']);
    
    // Draw heatmap cells
    svg.selectAll()
        .data(normalizedMatrix.flat())
        .enter()
        .append('rect')
        .attr('x', (d, i) => (i % HEATMAP_SKILLS_COUNT) * cellSize)
        .attr('y', (d, i) => Math.floor(i / HEATMAP_SKILLS_COUNT) * cellSize)
        .attr('width', cellSize)
        .attr('height', cellSize)
        .attr('fill', d => colorScale(d))
        .attr('stroke', 'white')
        .attr('stroke-width', 0.5)
        .append('title')
        .text((d, i) => {
            const row = Math.floor(i / HEATMAP_SKILLS_COUNT);
            const col = i % HEATMAP_SKILLS_COUNT;
            return `${topSkills[row]} + ${topSkills[col]}: ${matrix[row][col]} co-occurrences`;
        });
    
    // Add skill labels
    topSkills.forEach((skill, i) => {
        svg.append('text')
            .attr('x', i * cellSize + cellSize / 2)
            .attr('y', height - 5)
            .attr('text-anchor', 'middle')
            .attr('font-family', 'Courier New')
            .attr('font-size', '10px')
            .attr('fill', 'white')
            .text(skill.length > 10 ? skill.substring(0, 8) + '...' : skill)
            .attr('transform', `rotate(-45, ${i * cellSize + cellSize / 2}, ${height - 5})`);
        
        svg.append('text')
            .attr('x', 5)
            .attr('y', i * cellSize + cellSize / 2 + 5)
            .attr('text-anchor', 'start')
            .attr('font-family', 'Courier New')
            .attr('font-size', '10px')
            .attr('fill', 'white')
            .text(skill.length > 10 ? skill.substring(0, 8) + '...' : skill);
    });
}

// Chart 3B: Skill Network Graph
function createSkillNetwork() {
    const topSkills = [...skillsData]
        .sort((a, b) => b.count - a.count)
        .slice(0, NETWORK_SKILLS_COUNT)
        .map(skill => skill.skill);
    
    // Calculate co-occurrences
    const nodes = topSkills.map(skill => ({ id: skill }));
    const links = [];
    
    for (let i = 0; i < topSkills.length; i++) {
        for (let j = i + 1; j < topSkills.length; j++) {
            const skill1 = topSkills[i];
            const skill2 = topSkills[j];
            let count = 0;
            
            vacanciesWithSkills.forEach(vacancy => {
                const vacancySkills = vacancy.skills ? JSON.parse(vacancy.skills) : [];
                if (vacancySkills.includes(skill1) && vacancySkills.includes(skill2)) {
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
    
    // Create network with D3
    const container = document.getElementById('networkContainer');
    container.innerHTML = '';
    
    const width = 500;
    const height = 500;
    
    const svg = d3.select(container)
        .append('svg')
        .attr('width', width)
        .attr('height', height);
    
    // Create simulation
    const simulation = d3.forceSimulation(nodes)
        .force('link', d3.forceLink(links).id(d => d.id).distance(100))
        .force('charge', d3.forceManyBody().strength(-300))
        .force('center', d3.forceCenter(width / 2, height / 2));
    
    // Draw links
    const link = svg.append('g')
        .selectAll('line')
        .data(links)
        .enter()
        .append('line')
        .attr('stroke', '#ff71ce')
        .attr('stroke-width', d => Math.sqrt(d.value));
    
    // Draw nodes
    const node = svg.append('g')
        .selectAll('circle')
        .data(nodes)
        .enter()
        .append('g')
        .call(d3.drag()
            .on('start', dragstarted)
            .on('drag', dragged)
            .on('end', dragended));
    
    node.append('circle')
        .attr('r', 15)
        .attr('fill', '#01cdfe')
        .attr('stroke', 'white');
    
    node.append('text')
        .attr('dy', 4)
        .attr('text-anchor', 'middle')
        .attr('font-family', 'Courier New')
        .attr('font-size', '10px')
        .attr('fill', 'white')
        .text(d => d.id.length > 8 ? d.id.substring(0, 6) + '...' : d.id);
    
    // Update positions
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
}

// Fake CPU usage animation
function animateCPUUsage() {
    const cpuElement = document.getElementById('cpuUsage');
    const levels = ['▱▱▱▱▱ 0%', '▰▱▱▱▱ 21%', '▰▰▱▱▱ 42%', '▰▰▰▱▱ 63%', '▰▰▰▰▱ 84%', '▰▰▰▰▰ 100%'];
    let currentLevel = 2;
    
    setInterval(() => {
        currentLevel = (currentLevel + 1) % levels.length;
        cpuElement.textContent = levels[currentLevel];
    }, 3000);
}
