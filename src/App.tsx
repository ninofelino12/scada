import { useEffect, useState, useRef, useCallback } from 'react';
import * as d3 from 'd3';

interface DeviceData {
  lastBoot: {
    bootTimeMs?: number;
    date?: string;
    gps?: string;
    ip?: string;
    mac?: string;
  };
}

interface SensorLog {
  humidity: number;
  temp: number;
  timestamp: number;
}

interface BootEvent {
  bootTimeMs?: number;
  date?: string;
  gps?: string;
  ip?: string;
  mac?: string;
}

interface ApiData {
  devices: Record<string, DeviceData>;
  bootEvents: Record<string, BootEvent>;
  sensor_logs: Record<string, SensorLog>;
  lastUpdated: string;
}

function App() {
  const [data, setData] = useState<ApiData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [selectedDevice, setSelectedDevice] = useState<string | null>(null);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const fetchData = useCallback(async () => {
    try {
      const response = await fetch('https://monitor-app-delta-umber.vercel.app/api/rtdb');
      const result = await response.json();
      if (result.success) {
        setData(result.data);
        setError(null);
      }
      setLoading(false);
    } catch {
      setError('Failed to fetch data from server');
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, [fetchData]);

  useEffect(() => {
    if (!data || !svgRef.current) return;
    drawSCADA(data);
  }, [data, selectedDevice]);

  const formatUptime = (ms: number): string => {
    const seconds = Math.floor(ms / 1000);
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    if (days > 0) return `${days}d ${hours}h ${mins}m`;
    if (hours > 0) return `${hours}h ${mins}m`;
    return `${mins}m`;
  };

  const isDeviceOnline = (deviceData: DeviceData): boolean => {
    if (deviceData.lastBoot.date) {
      return new Date(deviceData.lastBoot.date).getTime() > Date.now() - 3600000;
    }
    return false;
  };

  const drawSCADA = (apiData: ApiData) => {
    if (!svgRef.current) return;
    const svgEl = svgRef.current;
    const svg = d3.select(svgEl);
    svg.selectAll('*').remove();

    const width = svgEl.clientWidth || 1200;
    const height = svgEl.clientHeight || 650;

    svg.attr('viewBox', `0 0 ${width} ${height}`);

    // Defs for gradients and filters
    const defs = svg.append('defs');

    // Glow filter
    const glowFilter = defs.append('filter').attr('id', 'glow');
    glowFilter.append('feGaussianBlur').attr('stdDeviation', '3').attr('result', 'coloredBlur');
    const feMerge = glowFilter.append('feMerge');
    feMerge.append('feMergeNode').attr('in', 'coloredBlur');
    feMerge.append('feMergeNode').attr('in', 'SourceGraphic');

    // Strong glow
    const strongGlow = defs.append('filter').attr('id', 'strongGlow');
    strongGlow.append('feGaussianBlur').attr('stdDeviation', '5').attr('result', 'coloredBlur');
    const feMerge2 = strongGlow.append('feMerge');
    feMerge2.append('feMergeNode').attr('in', 'coloredBlur');
    feMerge2.append('feMergeNode').attr('in', 'SourceGraphic');

    // Background grid
    const gridGroup = svg.append('g').attr('class', 'grid');
    for (let x = 0; x < width; x += 30) {
      gridGroup.append('line')
        .attr('x1', x).attr('y1', 0)
        .attr('x2', x).attr('y2', height)
        .attr('stroke', '#0d1a2a').attr('stroke-width', 0.5);
    }
    for (let y = 0; y < height; y += 30) {
      gridGroup.append('line')
        .attr('x1', 0).attr('y1', y)
        .attr('x2', width).attr('y2', y)
        .attr('stroke', '#0d1a2a').attr('stroke-width', 0.5);
    }

    // Major grid lines
    for (let x = 0; x < width; x += 150) {
      gridGroup.append('line')
        .attr('x1', x).attr('y1', 0)
        .attr('x2', x).attr('y2', height)
        .attr('stroke', '#12233a').attr('stroke-width', 1);
    }
    for (let y = 0; y < height; y += 150) {
      gridGroup.append('line')
        .attr('x1', 0).attr('y1', y)
        .attr('x2', width).attr('y2', y)
        .attr('stroke', '#12233a').attr('stroke-width', 1);
    }

    // ===== SERVER SECTION =====
    const serverX = width / 2;
    const serverY = 85;

    // Server outer glow
    svg.append('rect')
      .attr('x', serverX - 80).attr('y', serverY - 60)
      .attr('width', 160).attr('height', 120)
      .attr('rx', 12).attr('ry', 12)
      .attr('fill', 'none')
      .attr('stroke', '#00d4ff')
      .attr('stroke-width', 1)
      .attr('opacity', 0.3)
      .attr('filter', 'url(#strongGlow)');

    const serverGroup = svg.append('g')
      .attr('transform', `translate(${serverX}, ${serverY})`);

    // Server body
    serverGroup.append('rect')
      .attr('x', -70).attr('y', -50)
      .attr('width', 140).attr('height', 100)
      .attr('rx', 8).attr('ry', 8)
      .attr('fill', '#081828')
      .attr('stroke', '#00d4ff')
      .attr('stroke-width', 2.5)
      .attr('filter', 'url(#glow)');

    // Server rack units
    const rackUnits = [-35, -10, 15];
    rackUnits.forEach((ry) => {
      serverGroup.append('rect')
        .attr('x', -58).attr('y', ry)
        .attr('width', 116).attr('height', 20)
        .attr('rx', 3)
        .attr('fill', '#0a2040')
        .attr('stroke', '#1a4a6a')
        .attr('stroke-width', 1);

      // LEDs
      serverGroup.append('circle')
        .attr('cx', -46).attr('cy', ry + 10)
        .attr('r', 3.5)
        .attr('fill', '#00ff88')
        .attr('filter', 'url(#glow)')
        .append('animate')
        .attr('attributeName', 'opacity')
        .attr('values', '1;0.4;1')
        .attr('dur', `${1.5 + Math.random()}s`)
        .attr('repeatCount', 'indefinite');

      serverGroup.append('circle')
        .attr('cx', -36).attr('cy', ry + 10)
        .attr('r', 3)
        .attr('fill', '#00d4ff')
        .attr('filter', 'url(#glow)');

      serverGroup.append('circle')
        .attr('cx', -26).attr('cy', ry + 10)
        .attr('r', 3)
        .attr('fill', '#ffaa00')
        .attr('opacity', 0.7);

      // Drive bays
      for (let d = 0; d < 4; d++) {
        serverGroup.append('rect')
          .attr('x', -5 + d * 16).attr('y', ry + 3)
          .attr('width', 13).attr('height', 14)
          .attr('rx', 1)
          .attr('fill', '#0d2844')
          .attr('stroke', '#1a3a5a')
          .attr('stroke-width', 0.5);
      }

      // Activity indicator
      serverGroup.append('rect')
        .attr('x', 50).attr('y', ry + 4)
        .attr('width', 4).attr('height', 12)
        .attr('rx', 1)
        .attr('fill', '#00ff88')
        .attr('opacity', 0.6)
        .append('animate')
        .attr('attributeName', 'height')
        .attr('values', '12;4;12;8;12')
        .attr('dur', '2s')
        .attr('repeatCount', 'indefinite');
    });

    // Server title
    serverGroup.append('text')
      .attr('x', 0).attr('y', -62)
      .attr('text-anchor', 'middle')
      .attr('fill', '#00d4ff')
      .attr('font-size', '13px')
      .attr('font-weight', 'bold')
      .attr('font-family', 'monospace')
      .attr('filter', 'url(#glow)')
      .text('⬡ RTDB CLOUD SERVER ⬡');

    serverGroup.append('text')
      .attr('x', 0).attr('y', 68)
      .attr('text-anchor', 'middle')
      .attr('fill', '#4a7a9a')
      .attr('font-size', '9px')
      .attr('font-family', 'monospace')
      .text('monitor-app-delta-umber.vercel.app');

    // Animated radar pulse from server
    for (let i = 0; i < 4; i++) {
      svg.append('circle')
        .attr('cx', serverX)
        .attr('cy', serverY)
        .attr('r', 80)
        .attr('fill', 'none')
        .attr('stroke', '#00d4ff')
        .attr('stroke-width', 0.8)
        .attr('opacity', 0)
        .append('animate')
        .attr('attributeName', 'r')
        .attr('from', '80')
        .attr('to', '200')
        .attr('dur', '4s')
        .attr('begin', `${i}s`)
        .attr('repeatCount', 'indefinite');

      svg.append('circle')
        .attr('cx', serverX)
        .attr('cy', serverY)
        .attr('r', 80)
        .attr('fill', 'none')
        .attr('stroke', '#00d4ff')
        .attr('stroke-width', 0.8)
        .attr('opacity', 0)
        .append('animate')
        .attr('attributeName', 'opacity')
        .attr('from', '0.4')
        .attr('to', '0')
        .attr('dur', '4s')
        .attr('begin', `${i}s`)
        .attr('repeatCount', 'indefinite');
    }

    // ===== BUS BAR (horizontal cable tray) =====
    const devices = Object.entries(apiData.devices).filter(([key]) => key !== 'test');
    const deviceCount = devices.length;
    const busY = 220;
    const margin = 80;
    const busStartX = margin + 40;
    const busEndX = width - margin - 40;

    // Cable tray background
    svg.append('rect')
      .attr('x', busStartX - 10).attr('y', busY - 8)
      .attr('width', busEndX - busStartX + 20).attr('height', 16)
      .attr('rx', 3)
      .attr('fill', '#0a1828')
      .attr('stroke', '#1a3a5a')
      .attr('stroke-width', 1)
      .attr('opacity', 0.8);

    // Main bus cable
    svg.append('line')
      .attr('x1', busStartX).attr('y1', busY)
      .attr('x2', busEndX).attr('y2', busY)
      .attr('stroke', '#00d4ff')
      .attr('stroke-width', 4)
      .attr('opacity', 0.7)
      .attr('filter', 'url(#glow)');

    // Bus label
    svg.append('text')
      .attr('x', busStartX - 5).attr('y', busY - 15)
      .attr('fill', '#4a7a9a')
      .attr('font-size', '9px')
      .attr('font-family', 'monospace')
      .text('DATA BUS ─── RS485/ETHERNET');

    // Connection from server to bus
    const serverToBusPath = `M ${serverX} ${serverY + 55} L ${serverX} ${busY - 8}`;
    svg.append('path')
      .attr('d', serverToBusPath)
      .attr('fill', 'none')
      .attr('stroke', '#00d4ff')
      .attr('stroke-width', 3)
      .attr('opacity', 0.8)
      .attr('filter', 'url(#glow)');

    // Junction box at server-bus connection
    svg.append('rect')
      .attr('x', serverX - 12).attr('y', busY - 14)
      .attr('width', 24).attr('height', 28)
      .attr('rx', 3)
      .attr('fill', '#0a2040')
      .attr('stroke', '#00d4ff')
      .attr('stroke-width', 1.5);

    // Animated data packets on server connection
    for (let i = 0; i < 3; i++) {
      svg.append('circle')
        .attr('r', 3)
        .attr('fill', '#00ff88')
        .attr('filter', 'url(#glow)')
        .append('animateMotion')
        .attr('dur', '2s')
        .attr('begin', `${i * 0.6}s`)
        .attr('repeatCount', 'indefinite')
        .attr('path', `M ${serverX} ${serverY + 55} L ${serverX} ${busY}`);
    }

    // ===== DEVICES =====
    const deviceY = 380;
    const deviceSpacing = (busEndX - busStartX) / (deviceCount - 1 || 1);

    devices.forEach(([deviceId, deviceData], index) => {
      const dx = deviceCount === 1 ? width / 2 : busStartX + index * deviceSpacing;
      const online = isDeviceOnline(deviceData);
      const isSelected = selectedDevice === deviceId;

      const deviceGroup = svg.append('g')
        .attr('transform', `translate(${dx}, ${deviceY})`)
        .attr('cursor', 'pointer')
        .on('click', () => {
          setSelectedDevice(selectedDevice === deviceId ? null : deviceId);
        });

      // Vertical cable from bus to device
      const cablePath = `M 0 ${-busY + deviceY - 100} L 0 -70`;
      
      // Cable conduit
      deviceGroup.append('rect')
        .attr('x', -4).attr('y', -busY + deviceY - 100)
        .attr('width', 8).attr('height', (-busY + deviceY - 100) * -1 - 70)
        .attr('fill', '#0a1828')
        .attr('stroke', '#1a3a5a')
        .attr('stroke-width', 0.5)
        .attr('opacity', 0.5);

      // Cable wire
      deviceGroup.append('line')
        .attr('x1', 0).attr('y1', -busY + deviceY - 100)
        .attr('x2', 0).attr('y2', -70)
        .attr('stroke', online ? '#00d4ff' : '#333')
        .attr('stroke-width', 2)
        .attr('stroke-dasharray', online ? '6,3' : '2,4')
        .attr('opacity', online ? 0.8 : 0.4);

      // Junction at bus
      deviceGroup.append('circle')
        .attr('cx', 0).attr('cy', -busY + deviceY - 100)
        .attr('r', 6)
        .attr('fill', '#0a2040')
        .attr('stroke', online ? '#00ff88' : '#555')
        .attr('stroke-width', 2);

      // Cable connector at device top
      deviceGroup.append('rect')
        .attr('x', -8).attr('y', -75)
        .attr('width', 16).attr('height', 10)
        .attr('rx', 2)
        .attr('fill', '#1a3a5a')
        .attr('stroke', online ? '#00d4ff' : '#333')
        .attr('stroke-width', 1);

      // Animated data flow
      if (online) {
        for (let p = 0; p < 2; p++) {
          deviceGroup.append('circle')
            .attr('r', 2.5)
            .attr('fill', '#00ff88')
            .attr('filter', 'url(#glow)')
            .append('animateMotion')
            .attr('dur', '1.5s')
            .attr('begin', `${p * 0.7 + index * 0.3}s`)
            .attr('repeatCount', 'indefinite')
            .attr('path', `M 0 ${-busY + deviceY - 100} L 0 -70`);
        }
      }

      // Device housing (ESP32 board style)
      const housingW = 120;
      const housingH = 130;

      // Selection highlight
      if (isSelected) {
        deviceGroup.append('rect')
          .attr('x', -housingW / 2 - 6).attr('y', -68)
          .attr('width', housingW + 12).attr('height', housingH + 12)
          .attr('rx', 10)
          .attr('fill', 'none')
          .attr('stroke', '#00d4ff')
          .attr('stroke-width', 2)
          .attr('stroke-dasharray', '4,2')
          .attr('filter', 'url(#glow)')
          .append('animate')
          .attr('attributeName', 'stroke-dashoffset')
          .attr('from', '0')
          .attr('to', '-12')
          .attr('dur', '1s')
          .attr('repeatCount', 'indefinite');
      }

      // PCB Board
      deviceGroup.append('rect')
        .attr('x', -housingW / 2).attr('y', -65)
        .attr('width', housingW).attr('height', housingH)
        .attr('rx', 5)
        .attr('fill', '#071422')
        .attr('stroke', online ? '#00d4ff' : '#333')
        .attr('stroke-width', isSelected ? 2.5 : 1.5);

      // PCB traces (decorative)
      const traceColor = online ? '#0a2a4a' : '#0a1520';
      for (let t = 0; t < 3; t++) {
        deviceGroup.append('line')
          .attr('x1', -housingW / 2 + 10).attr('y1', -50 + t * 40)
          .attr('x2', housingW / 2 - 10).attr('y2', -50 + t * 40)
          .attr('stroke', traceColor)
          .attr('stroke-width', 0.5);
      }

      // Main chip (ESP32)
      deviceGroup.append('rect')
        .attr('x', -22).attr('y', -45)
        .attr('width', 44).attr('height', 44)
        .attr('rx', 3)
        .attr('fill', '#0d2844')
        .attr('stroke', online ? '#1a5a8a' : '#222')
        .attr('stroke-width', 1);

      // Chip pins
      for (let p = -18; p <= 18; p += 9) {
        // Left pins
        deviceGroup.append('rect')
          .attr('x', -28).attr('y', p - 2)
          .attr('width', 7).attr('height', 3)
          .attr('fill', online ? '#3a7a9a' : '#333');
        // Right pins
        deviceGroup.append('rect')
          .attr('x', 21).attr('y', p - 2)
          .attr('width', 7).attr('height', 3)
          .attr('fill', online ? '#3a7a9a' : '#333');
      }
      // Top/bottom pins
      for (let p = -14; p <= 14; p += 7) {
        deviceGroup.append('rect')
          .attr('x', p - 1.5).attr('y', -51)
          .attr('width', 3).attr('height', 7)
          .attr('fill', online ? '#3a7a9a' : '#333');
        deviceGroup.append('rect')
          .attr('x', p - 1.5).attr('y', -4)
          .attr('width', 3).attr('height', 7)
          .attr('fill', online ? '#3a7a9a' : '#333');
      }

      // Chip label
      deviceGroup.append('text')
        .attr('x', 0).attr('y', -20)
        .attr('text-anchor', 'middle')
        .attr('fill', online ? '#4a8aaa' : '#333')
        .attr('font-size', '7px')
        .attr('font-family', 'monospace')
        .text('ESP32');

      // Status LED
      deviceGroup.append('circle')
        .attr('cx', 40).attr('cy', -40)
        .attr('r', 5)
        .attr('fill', online ? '#00ff88' : '#ff4444')
        .attr('filter', 'url(#glow)')
        .append('animate')
        .attr('attributeName', 'opacity')
        .attr('values', online ? '1;0.5;1' : '0.8;0.3;0.8')
        .attr('dur', online ? '2s' : '1s')
        .attr('repeatCount', 'indefinite');

      // Power LED
      deviceGroup.append('circle')
        .attr('cx', -40).attr('cy', -40)
        .attr('r', 4)
        .attr('fill', online ? '#ff4444' : '#330000')
        .attr('opacity', online ? 0.8 : 0.3);

      // Antenna
      deviceGroup.append('rect')
        .attr('x', 35).attr('y', -60)
        .attr('width', 12).attr('height', 20)
        .attr('rx', 2)
        .attr('fill', '#1a3050')
        .attr('stroke', online ? '#2a5070' : '#222')
        .attr('stroke-width', 0.5);

      // WiFi signal arcs (if online)
      if (online) {
        for (let a = 0; a < 3; a++) {
          deviceGroup.append('path')
            .attr('d', `M ${41 - 6 - a * 4} ${-55} A ${6 + a * 4} ${6 + a * 4} 0 0 1 ${41 + 6 + a * 4} ${-55}`)
            .attr('fill', 'none')
            .attr('stroke', '#00d4ff')
            .attr('stroke-width', 1)
            .attr('opacity', 0)
            .append('animate')
            .attr('attributeName', 'opacity')
            .attr('values', '0;0.6;0')
            .attr('dur', '2s')
            .attr('begin', `${a * 0.4}s`)
            .attr('repeatCount', 'indefinite');
        }
      }

      // MAC Address
      const macDisplay = deviceId.replace(/_/g, ':');
      deviceGroup.append('text')
        .attr('x', 0).attr('y', 15)
        .attr('text-anchor', 'middle')
        .attr('fill', online ? '#88ccff' : '#555')
        .attr('font-size', '8px')
        .attr('font-family', 'monospace')
        .text(macDisplay.slice(-11));

      // IP Address
      deviceGroup.append('text')
        .attr('x', 0).attr('y', 28)
        .attr('text-anchor', 'middle')
        .attr('fill', online ? '#66aacc' : '#444')
        .attr('font-size', '9px')
        .attr('font-family', 'monospace')
        .text(deviceData.lastBoot.ip || 'N/A');

      // Status badge
      deviceGroup.append('rect')
        .attr('x', -28).attr('y', 35)
        .attr('width', 56).attr('height', 16)
        .attr('rx', 8)
        .attr('fill', online ? '#003322' : '#330000')
        .attr('stroke', online ? '#00ff88' : '#ff4444')
        .attr('stroke-width', 1);

      deviceGroup.append('text')
        .attr('x', 0).attr('y', 47)
        .attr('text-anchor', 'middle')
        .attr('fill', online ? '#00ff88' : '#ff4444')
        .attr('font-size', '9px')
        .attr('font-weight', 'bold')
        .attr('font-family', 'monospace')
        .text(online ? '● ONLINE' : '● OFFLINE');

      // Uptime
      if (deviceData.lastBoot.bootTimeMs) {
        deviceGroup.append('text')
          .attr('x', 0).attr('y', 80)
          .attr('text-anchor', 'middle')
          .attr('fill', '#4a6a8a')
          .attr('font-size', '8px')
          .attr('font-family', 'monospace')
          .text(`⏱ ${formatUptime(deviceData.lastBoot.bootTimeMs)}`);
      }

      // Last boot date
      if (deviceData.lastBoot.date) {
        deviceGroup.append('text')
          .attr('x', 0).attr('y', 95)
          .attr('text-anchor', 'middle')
          .attr('fill', '#3a5a7a')
          .attr('font-size', '7px')
          .attr('font-family', 'monospace')
          .text(new Date(deviceData.lastBoot.date).toLocaleString());
      }
    });

    // ===== SENSOR DATA PANEL =====
    const sensorLogs = Object.values(apiData.sensor_logs);
    if (sensorLogs.length > 0) {
      drawSensorPanel(svg, sensorLogs, width, height, defs);
    }

    // ===== CORNER DECORATIONS =====
    // Top-left corner bracket
    svg.append('path')
      .attr('d', 'M 5 30 L 5 5 L 30 5')
      .attr('fill', 'none')
      .attr('stroke', '#00d4ff')
      .attr('stroke-width', 2)
      .attr('opacity', 0.5);

    // Top-right corner bracket
    svg.append('path')
      .attr('d', `M ${width - 30} 5 L ${width - 5} 5 L ${width - 5} 30`)
      .attr('fill', 'none')
      .attr('stroke', '#00d4ff')
      .attr('stroke-width', 2)
      .attr('opacity', 0.5);

    // Bottom-left corner bracket
    svg.append('path')
      .attr('d', `M 5 ${height - 30} L 5 ${height - 5} L 30 ${height - 5}`)
      .attr('fill', 'none')
      .attr('stroke', '#00d4ff')
      .attr('stroke-width', 2)
      .attr('opacity', 0.5);

    // Bottom-right corner bracket
    svg.append('path')
      .attr('d', `M ${width - 30} ${height - 5} L ${width - 5} ${height - 5} L ${width - 5} ${height - 30}`)
      .attr('fill', 'none')
      .attr('stroke', '#00d4ff')
      .attr('stroke-width', 2)
      .attr('opacity', 0.5);

    // System info text
    svg.append('text')
      .attr('x', 15).attr('y', height - 10)
      .attr('fill', '#2a4a6a')
      .attr('font-size', '8px')
      .attr('font-family', 'monospace')
      .text(`SCADA v1.0 | ${new Date().toLocaleDateString()} | ${deviceCount} DEVICES MONITORED`);

    svg.append('text')
      .attr('x', width - 15).attr('y', height - 10)
      .attr('text-anchor', 'end')
      .attr('fill', '#2a4a6a')
      .attr('font-size', '8px')
      .attr('font-family', 'monospace')
      .text(`REFRESH: 10s | D3.js v${d3.version}`);
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const drawSensorPanel = (svg: any, logs: SensorLog[], width: number, height: number, defs: any) => {
    const panelY = height - 170;
    const panelX = 40;
    const panelW = width - 80;
    const panelH = 145;

    // Panel background
    svg.append('rect')
      .attr('x', panelX).attr('y', panelY)
      .attr('width', panelW).attr('height', panelH)
      .attr('rx', 6)
      .attr('fill', '#060e1a')
      .attr('stroke', '#1a3a5a')
      .attr('stroke-width', 1);

    // Panel header bar
    svg.append('rect')
      .attr('x', panelX).attr('y', panelY)
      .attr('width', panelW).attr('height', 22)
      .attr('rx', 6)
      .attr('fill', '#0a1828');

    svg.append('rect')
      .attr('x', panelX).attr('y', panelY + 16)
      .attr('width', panelW).attr('height', 6)
      .attr('fill', '#0a1828');

    svg.append('text')
      .attr('x', panelX + 12).attr('y', panelY + 15)
      .attr('fill', '#00d4ff')
      .attr('font-size', '10px')
      .attr('font-weight', 'bold')
      .attr('font-family', 'monospace')
      .text('▸ SENSOR DATA LOGGER — Temperature & Humidity Monitor');

    // Current values display
    const lastLog = logs[logs.length - 1];
    svg.append('text')
      .attr('x', panelX + panelW - 12).attr('y', panelY + 15)
      .attr('text-anchor', 'end')
      .attr('fill', '#ff6644')
      .attr('font-size', '10px')
      .attr('font-family', 'monospace')
      .text(`T: ${lastLog.temp}°C  H: ${lastLog.humidity}%`);

    // Temperature chart
    const chartX = panelX + 15;
    const chartY = panelY + 32;
    const chartW = (panelW - 50) / 2;
    const chartH = 95;

    // Temp chart background
    svg.append('rect')
      .attr('x', chartX).attr('y', chartY)
      .attr('width', chartW).attr('height', chartH)
      .attr('fill', '#040c16')
      .attr('stroke', '#0d2030')
      .attr('stroke-width', 1);

    // Temp grid lines
    const tempMin = d3.min(logs, d => d.temp)! - 0.3;
    const tempMax = d3.max(logs, d => d.temp)! + 0.3;
    const tempScale = d3.scaleLinear()
      .domain([tempMin, tempMax])
      .range([chartH, 0]);

    for (let g = 0; g < 4; g++) {
      const gy = (chartH / 4) * g;
      svg.append('line')
        .attr('x1', chartX).attr('y1', chartY + gy)
        .attr('x2', chartX + chartW).attr('y2', chartY + gy)
        .attr('stroke', '#0d1a2a')
        .attr('stroke-width', 0.5);
    }

    const tempXScale = d3.scaleLinear()
      .domain([0, logs.length - 1])
      .range([5, chartW - 5]);

    // Temp area fill
    const tempGrad = defs.append('linearGradient')
      .attr('id', 'tempGrad')
      .attr('x1', '0%').attr('y1', '0%')
      .attr('x2', '0%').attr('y2', '100%');
    tempGrad.append('stop').attr('offset', '0%').attr('stop-color', '#ff6644').attr('stop-opacity', 0.25);
    tempGrad.append('stop').attr('offset', '100%').attr('stop-color', '#ff6644').attr('stop-opacity', 0.02);

    const tempArea = d3.area<SensorLog>()
      .x((_, i) => tempXScale(i))
      .y0(chartH)
      .y1(d => tempScale(d.temp))
      .curve(d3.curveMonotoneX);

    svg.append('path')
      .datum(logs)
      .attr('d', tempArea)
      .attr('fill', 'url(#tempGrad)')
      .attr('transform', `translate(${chartX}, ${chartY})`);

    // Temp line
    const tempLine = d3.line<SensorLog>()
      .x((_, i) => tempXScale(i))
      .y(d => tempScale(d.temp))
      .curve(d3.curveMonotoneX);

    svg.append('path')
      .datum(logs)
      .attr('d', tempLine)
      .attr('fill', 'none')
      .attr('stroke', '#ff6644')
      .attr('stroke-width', 2)
      .attr('transform', `translate(${chartX}, ${chartY})`)
      .attr('filter', 'url(#glow)');

    // Temp data points
    logs.forEach((log, i) => {
      svg.append('circle')
        .attr('cx', chartX + tempXScale(i))
        .attr('cy', chartY + tempScale(log.temp))
        .attr('r', 2)
        .attr('fill', '#ff6644')
        .attr('opacity', 0.7);
    });

    // Temp label
    svg.append('text')
      .attr('x', chartX + 5).attr('y', chartY - 4)
      .attr('fill', '#ff6644')
      .attr('font-size', '9px')
      .attr('font-family', 'monospace')
      .text(`🌡 TEMPERATURE (°C) — Current: ${lastLog.temp}°C`);

    // Humidity chart
    const humChartX = chartX + chartW + 25;

    svg.append('rect')
      .attr('x', humChartX).attr('y', chartY)
      .attr('width', chartW).attr('height', chartH)
      .attr('fill', '#040c16')
      .attr('stroke', '#0d2030')
      .attr('stroke-width', 1);

    // Humidity grid lines
    for (let g = 0; g < 4; g++) {
      const gy = (chartH / 4) * g;
      svg.append('line')
        .attr('x1', humChartX).attr('y1', chartY + gy)
        .attr('x2', humChartX + chartW).attr('y2', chartY + gy)
        .attr('stroke', '#0d1a2a')
        .attr('stroke-width', 0.5);
    }

    const humMin = d3.min(logs, d => d.humidity)! - 0.5;
    const humMax = d3.max(logs, d => d.humidity)! + 0.5;
    const humScale = d3.scaleLinear()
      .domain([humMin, humMax])
      .range([chartH, 0]);

    // Humidity area fill
    const humGrad = defs.append('linearGradient')
      .attr('id', 'humGrad')
      .attr('x1', '0%').attr('y1', '0%')
      .attr('x2', '0%').attr('y2', '100%');
    humGrad.append('stop').attr('offset', '0%').attr('stop-color', '#44aaff').attr('stop-opacity', 0.25);
    humGrad.append('stop').attr('offset', '100%').attr('stop-color', '#44aaff').attr('stop-opacity', 0.02);

    const humArea = d3.area<SensorLog>()
      .x((_, i) => tempXScale(i))
      .y0(chartH)
      .y1(d => humScale(d.humidity))
      .curve(d3.curveMonotoneX);

    svg.append('path')
      .datum(logs)
      .attr('d', humArea)
      .attr('fill', 'url(#humGrad)')
      .attr('transform', `translate(${humChartX}, ${chartY})`);

    // Humidity line
    const humLine = d3.line<SensorLog>()
      .x((_, i) => tempXScale(i))
      .y(d => humScale(d.humidity))
      .curve(d3.curveMonotoneX);

    svg.append('path')
      .datum(logs)
      .attr('d', humLine)
      .attr('fill', 'none')
      .attr('stroke', '#44aaff')
      .attr('stroke-width', 2)
      .attr('transform', `translate(${humChartX}, ${chartY})`)
      .attr('filter', 'url(#glow)');

    // Humidity data points
    logs.forEach((log, i) => {
      svg.append('circle')
        .attr('cx', humChartX + tempXScale(i))
        .attr('cy', chartY + humScale(log.humidity))
        .attr('r', 2)
        .attr('fill', '#44aaff')
        .attr('opacity', 0.7);
    });

    // Humidity label
    svg.append('text')
      .attr('x', humChartX + 5).attr('y', chartY - 4)
      .attr('fill', '#44aaff')
      .attr('font-size', '9px')
      .attr('font-family', 'monospace')
      .text(`💧 HUMIDITY (%) — Current: ${lastLog.humidity}%`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050d18] flex items-center justify-center">
        <div className="text-center">
          <div className="relative">
            <div className="animate-spin rounded-full h-20 w-20 border-t-2 border-b-2 border-cyan-400 mx-auto"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="h-12 w-12 rounded-full border border-cyan-600 animate-ping opacity-20"></div>
            </div>
          </div>
          <p className="text-cyan-400 text-lg mt-6 font-mono tracking-wider">CONNECTING TO RTDB SERVER...</p>
          <p className="text-gray-600 text-sm mt-2 font-mono">Establishing secure connection</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#050d18] flex items-center justify-center">
        <div className="text-center bg-[#0a1628] border border-red-900/50 rounded-lg p-8">
          <div className="text-red-500 text-5xl mb-4">⚠️</div>
          <p className="text-red-400 text-lg font-mono">{error}</p>
          <button onClick={fetchData} className="mt-6 px-6 py-2 bg-cyan-700 text-white rounded font-mono hover:bg-cyan-600 transition-colors border border-cyan-500/30">
            ↻ RETRY CONNECTION
          </button>
        </div>
      </div>
    );
  }

  const deviceEntries = data ? Object.entries(data.devices).filter(([key]) => key !== 'test') : [];
  const onlineDevices = deviceEntries.filter(([, d]) => isDeviceOnline(d)).length;

  return (
    <div className="min-h-screen bg-[#050d18] text-white overflow-hidden flex flex-col">
      {/* Header */}
      <header className="bg-[#0a1628] border-b border-cyan-900/50 px-4 py-2.5 shrink-0">
        <div className="flex items-center justify-between max-w-[1400px] mx-auto">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-3 h-3 rounded-full bg-green-400"></div>
              <div className="absolute inset-0 w-3 h-3 rounded-full bg-green-400 animate-ping opacity-40"></div>
            </div>
            <h1 className="text-lg font-bold text-cyan-400 tracking-wider font-mono glow-cyan">
              SCADA DATALOGGER MONITOR
            </h1>
            <span className="text-[10px] text-gray-600 font-mono border border-gray-700 px-1.5 py-0.5 rounded">v1.0</span>
          </div>
          <div className="flex items-center gap-5 text-xs font-mono">
            <div className="flex items-center gap-2">
              <span className="text-gray-500">DEVICES:</span>
              <span className="text-cyan-400">{onlineDevices}/{deviceEntries.length}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-gray-500">UPDATED:</span>
              <span className="text-green-400">
                {data?.lastUpdated ? new Date(data.lastUpdated).toLocaleTimeString() : '--:--:--'}
              </span>
            </div>
            <div className="text-cyan-300 bg-cyan-900/20 px-2 py-1 rounded border border-cyan-800/30">
              {currentTime.toLocaleTimeString()}
            </div>
          </div>
        </div>
      </header>

      {/* Status Bar */}
      <div className="bg-[#080f1c] border-b border-cyan-900/20 px-4 py-1.5 shrink-0">
        <div className="flex items-center gap-5 max-w-[1400px] mx-auto text-[10px] font-mono">
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-green-400"></div>
            <span className="text-gray-500">SERVER: <span className="text-green-400">CONNECTED</span></span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-cyan-400"></div>
            <span className="text-gray-500">NETWORK: <span className="text-cyan-400">ACTIVE</span></span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-yellow-400"></div>
            <span className="text-gray-500">POLL: <span className="text-yellow-400">10s</span></span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-purple-400"></div>
            <span className="text-gray-500">SENSORS: <span className="text-purple-400">{data ? Object.keys(data.sensor_logs).length : 0} LOGS</span></span>
          </div>
          <div className="ml-auto text-gray-600">
            {currentTime.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </div>
        </div>
      </div>

      {/* Main SCADA Visualization */}
      <div className="flex-1 p-3 overflow-hidden">
        <div className="relative h-full border border-cyan-900/30 rounded-lg overflow-hidden bg-[#050d18]">
          {/* Scanline overlay */}
          <div className="absolute inset-0 pointer-events-none scanline z-10"></div>
          <svg
            ref={svgRef}
            className="w-full h-full"
            style={{ minHeight: '600px' }}
          />
        </div>
      </div>

      {/* Device Detail Cards */}
      {data && (
        <div className="px-3 pb-3 shrink-0">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 max-w-[1400px] mx-auto">
            {deviceEntries.map(([deviceId, deviceData]) => {
              const online = isDeviceOnline(deviceData);
              const isSelected = selectedDevice === deviceId;
              return (
                <div
                  key={deviceId}
                  onClick={() => setSelectedDevice(isSelected ? null : deviceId)}
                  className={`device-card bg-[#0a1628] border rounded-lg p-3 cursor-pointer transition-all duration-300 ${
                    isSelected
                      ? 'border-cyan-400 shadow-lg shadow-cyan-900/20'
                      : 'border-cyan-900/30 hover:border-cyan-700/50'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className={`w-2.5 h-2.5 rounded-full ${online ? 'bg-green-400' : 'bg-red-500'}`}>
                        {online && <div className="w-2.5 h-2.5 rounded-full bg-green-400 animate-ping opacity-40"></div>}
                      </div>
                      <span className="text-[10px] font-mono text-cyan-300">
                        {deviceId.replace(/_/g, ':')}
                      </span>
                    </div>
                    <span className={`text-[9px] px-1.5 py-0.5 rounded font-mono ${
                      online ? 'bg-green-900/40 text-green-400 border border-green-800/30' : 'bg-red-900/40 text-red-400 border border-red-800/30'
                    }`}>
                      {online ? 'ONLINE' : 'OFFLINE'}
                    </span>
                  </div>
                  <div className="space-y-1 text-[10px] font-mono">
                    <div className="flex justify-between">
                      <span className="text-gray-600">IP</span>
                      <span className="text-gray-400">{deviceData.lastBoot.ip || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">LAST BOOT</span>
                      <span className="text-gray-400">
                        {deviceData.lastBoot.date ? new Date(deviceData.lastBoot.date).toLocaleString() : 'N/A'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">UPTIME</span>
                      <span className="text-gray-400">
                        {deviceData.lastBoot.bootTimeMs ? formatUptime(deviceData.lastBoot.bootTimeMs) : 'N/A'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">GPS</span>
                      <span className="text-gray-400">{deviceData.lastBoot.gps || 'N/A'}</span>
                    </div>
                  </div>
                  {deviceData.lastBoot.bootTimeMs && (
                    <div className="mt-2">
                      <div className="flex justify-between text-[9px] font-mono mb-0.5">
                        <span className="text-gray-600">UPTIME BAR</span>
                        <span className="text-gray-500">{formatUptime(deviceData.lastBoot.bootTimeMs)}</span>
                      </div>
                      <div className="h-1 bg-gray-800 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-1000 ${
                            online
                              ? 'bg-gradient-to-r from-green-600 to-cyan-400'
                              : 'bg-red-600'
                          }`}
                          style={{
                            width: `${Math.min(100, (deviceData.lastBoot.bootTimeMs / (7 * 86400000)) * 100)}%`
                          }}
                        ></div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="bg-[#0a1628] border-t border-cyan-900/30 px-4 py-2 shrink-0">
        <div className="flex items-center justify-between max-w-[1400px] mx-auto text-[10px] text-gray-600 font-mono">
          <span>SCADA DATALOGGER MONITOR v1.0</span>
          <span>D3.js v{d3.version} + React + TailwindCSS</span>
          <span className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse"></div>
            SYSTEM OPERATIONAL
          </span>
        </div>
      </footer>
    </div>
  );
}

export default App;
