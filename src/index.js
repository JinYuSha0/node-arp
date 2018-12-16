const os = require('os')

// 获取本机所有网卡的内网IP地址和mac地址
function getLocalNetworkCardsInfo () {
	let res = []
	const ifaces = os.networkInterfaces()
	for (let name in ifaces) {
		ifaces[name].forEach(obj => {
			if (obj.family.toLowerCase() === 'ipv4' && obj.address !== '127.0.0.1') {
			  // cidr 就是当前子网段 可以直接用，但是没必要
				const { address, mac, netmask, cidr } = obj
				res.push({ name, address, mac, netmask })
			}
		})
	}
	return res
}

// 根据IP和子网掩码 获取局域网中所有子网段
function getSubNetByAddressAndNetMask ({address, netmask}) {
  // netmask = '255.255.252.0'
  // netmask = '255.255.255.224'

  netmask = netmask.split('.')
  address = address.split('.')

  const addZero = (num) => {
    let str = ''
    while (num) {
      str += '.0'
      num--
    }
    return str
  }

  const networkSegment = netmask.map((part, index) => Number(netmask[index]) ^ 255)

  // 子网后缀
  const subNetSuffix = '/' + netmask.map(part => {
    return Number(part).toString(2)
  }).join('').match(/1/g).length

  // 网络号
  const networkNumber = networkSegment
    .map((segment, index) => {
      if (segment === 0) {
        return address[index]
      }
      return null
    })
    .filter(segment => !!segment)
    .join('.') + '.'

  // 子网段
  const subNets = []

  // 当前网段
  let currSubnet = null

  // 计算所有子网段获取当前网段
  networkSegment.forEach((segment, index) => {
    if (segment !== 0 && subNets.length === 0) {

      // 子网数
      let subNetCount = Number((segment ^ 255).toString(2)) === 0
        ? 1
        : Math.pow(2, Number(segment ^ 255).toString(2).match(index < 3 ? /0/g : /1/g).length)

      for (let i = 0; i < subNetCount; i++) {
        if (index === 3) {
          const part = (i * (segment + 1))
          const subNet = networkNumber + part + subNetSuffix
          if (subNetCount === 1) {
            currSubnet = subNet
          } else {
            if (part < Number(address[3]) && Number(address[3]) < part + (segment + 1)) {
              currSubnet = subNet
            }
          }
          subNets.push(subNet)
        } else {
          const subNet = networkNumber + i + addZero(3 - index) + subNetSuffix
          if (Number(address[index]) === i) {
            currSubnet = subNet
          }
          subNets.push(subNet)
        }
      }
    }
  })

  return { subNets, currSubnet }
}

// 根据子网段获得网段下的所有可用ip
function getAllIPBySubNet({subNets, currSubnet}) {
  // todo
  // 注: 去除网络地址 和 网关地址
}

console.log(getSubNetByAddressAndNetMask(getLocalNetworkCardsInfo()[0]))
