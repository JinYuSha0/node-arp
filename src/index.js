const os = require('os')

// 获取本机所有网卡的内网IP地址和mac地址
function getLocalNetworkCardsInfo () {
	let res = []
	const ifaces = os.networkInterfaces()
	for (let name in ifaces) {
		ifaces[name].forEach(obj => {
			if (obj.family.toLowerCase() === 'ipv4' && obj.address !== '127.0.0.1') {
				const { address, mac, netmask } = obj
				res.push({ name, address, mac, netmask })
			}
		})
	}
	return res
}

// 根据IP和子网掩码 获取局域网中所有可用ip
function getLANAllIP ({address, netmask}) {
	console.log(address, netmask)
}

console.log(getLANAllIP(getLocalNetworkCardsInfo()[1]))
