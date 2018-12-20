const netUtils = require('./build/Release/socket.node')
const { fullConnectPortScan, halfOpenPortScan } = netUtils

// const startTime = +new Date()
// const openPorts = fullConnectPortScan('127.0.0.1', 0, 8100)
// const endTime = +new Date()
//
// console.log('开放端口:', openPorts, `耗时:${endTime - startTime}`)

/**
 * dstAddress
 * srcAddress
 * dstPort
 * srcPort
 */
// halfOpenPortScan('10.60.17.186', '10.60.17.193',  80, 80)

console.log(fullConnectPortScan('127.0.0.1', 8000, 8100))
