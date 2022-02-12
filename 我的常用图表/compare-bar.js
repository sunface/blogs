option = {
    title: {
      text: 'Rust vs Go算法性能'
    },
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'shadow'
      }
    },
    legend: {},
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      containLabel: true
    },
    xAxis: {
      type: 'value',
      boundaryGap: [0, 0.01]
    },
    yAxis: {
      type: 'category',
      data: ['binary-trees', 'regex-redux', 'mandelbrot', 'reverse-complment', 'k-nucleotide', 'spectral-norm','n-body','fasta','pidigits','fannkuch-redux']
    },
    series: [
      {
        name: 'Rust',
        type: 'bar',
        data: [1.09, 0.77, 0.93, 0.45, 2.70, 0.72,3.29,0.77,0.71,7.54],
         label: {
          show: true,
          position: 'right'
        },
      },
      {
        name: 'Go',
        type: 'bar',
        data: [12.23, 3.85, 3.73, 1.35, 7.46, 1.43,6.38,1.26,1.00,8.31],
        label: {
          show: true,
          position: 'right'
        },
      }
    ]
  };