const os = require('os')
const net = require('net')
const commands = require('system-basic-command')

// 网段补全
function getZero (num) {
  let str = ''
  while (num) {
    str += '.0'
    num--
  }
  return str
}

// 支持异步的组合函数
function compose(...funcs) {
  if(funcs.length === 0) {
    return arg => arg
  }

  if(funcs.length === 1) {
    return funcs[0]
  }

  return funcs.reduce((a, b) => (...args) => {
    const lastFuncRes = b(...args)
    if (Object.getPrototypeOf(lastFuncRes) === Promise.prototype) {
      return lastFuncRes.then(args => {
        return a(args)
      })
    } else {
      return a(lastFuncRes)
    }
  })
}

/**
 * 获取本机所有网卡的内网IP地址和mac地址
 * @param cardName？
 * @returns {
 *  name: string,     网卡名
 *  address: String,  ip地址
 *  mac: String,      mac地址
 *  netmask: String   子网掩码
 * } | Array
 */
function getLocalNetworkCardsInfo (cardName) {
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
	return cardName ? res.filter(card => card.name === cardName)[0] : res
}

/**
 * 获取网卡的网关地址
 * @param cardInfo
 * @returns {{
 *  ...cardInfo,  网卡信息
 *  gateWay,      网关地址
 * }}
 */
function getGatewayByNetworkCardName (cardInfo) {
  return new Promise((resolve, reject) => {
    commands.getGateway(cardInfo.name, gateway => {
      resolve({ ...cardInfo, gateway })
    })
  })
}

/**
 * 根据IP和子网掩码 获取所有网段
 * @param args
 * @returns {{
 *  ...args,
 *  subNets: Array,               子网段
 *  currNetSegment: *,            当前网段
 *  netmask: String.netmask | *,  子网掩码
 *  address: String.address | *   网络地址
 * }}
 */
function getSubNetByAddressAndNetMask (args) {
  let { address, netmask } = args

  // netmask = '255.255.240.0'
  // netmask = '255.255.255.224'

  netmask = netmask.split('.')
  address = address.split('.')

  // 异或处理
  const networkSegment = netmask.map((part, index) => Number(netmask[index]) ^ 255)

  // 网段后缀
  const subNetSuffix = '/' + netmask.map(part => {
    return Number(part).toString(2)
  }).join('').match(/1/g).length

  // 网络地址公共部分
  const networkAddressCommon = networkSegment
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
  let currNetSegment = null

  // 获取所有子网段
  // 注:划分子网是网络位向主机位借位数
  networkSegment.forEach((segment, index) => {
    if (segment !== 0 && subNets.length === 0) {

      // 子网数
      const subNetCount = Number((segment ^ 255).toString(2)) === 0
        ? 1
        : Math.pow(2, Number(segment ^ 255).toString(2).match(index < 3 ? /0/g : /1/g).length)

      for (let i = 0; i < subNetCount; i++) {
        if (index === 3) {
          const part = (i * (segment + 1))
          const subNet = networkAddressCommon + part + subNetSuffix
          if (subNetCount === 1) {
            currNetSegment = subNet
          } else {
            if (part < Number(address[3]) && Number(address[3]) < part + (segment + 1)) {
              currNetSegment = subNet
            }
          }
          subNets.push(subNet)
        } else {
          const subNet = networkAddressCommon + i + getZero(3 - index) + subNetSuffix
          if (Number(address[index]) === i) {
            currNetSegment = subNet
          }
          subNets.push(subNet)
        }
      }
    }
  })

  netmask = netmask.join('.')
  address = address.join('.')

  return { ...args, subNets, currNetSegment, netmask, address }
}

/**
 * 根据所属网段下的所有可用ip
 * @param args
 * @returns {{
 *  ...args,
 *  addressType: string,        地址类型 {A, B, C}
 *  networkAddress: (*|string), 网络地址
 *  broadcastAddress: string,   广播地址
 *  availableIP: Array          当前网段可用ip
 * }}
 */
function getAllIPBySubNet(args) {
  const { subNets, currNetSegment, netmask, address, gateway } = args

  const availableIP = [] // 可用IP地址
  const currNetNumber = currNetSegment.split('/')[0] // 网段
  const subNetSuffix = Number(currNetSegment.split('/')[1]) // 网段后缀
  let subNetSegmentNumber = Math.floor(subNetSuffix / 8)
  const addressType = [ 'A', 'B', 'C' ][subNetSegmentNumber - 1] // 地址类型
  const ipCount = Math.pow(2, 32 - subNetSuffix) // 组成子网段的所有ip数量
  const subNetSegment = currNetNumber.split('.')
  const subNetSegmentCommon = subNetSegment.splice(0, subNetSegmentNumber).join('.') // 网络地址公共网段

  const networkAddress = currNetSegment.split('/')[0] // 网络地址
  const broadcastAddress = networkAddress.split('.') // 广播地址
    .splice(0, subNetSegmentNumber)
    .concat(
      netmask.split('.').map((segment, index) => {
        if (index < 3) {
          return segment ^ 255
        } else {
          if (segment > 0) {
            return (segment ^ 255) + ipCount
          } else {
            return segment ^ 255
          }
        }
      }).splice(subNetSegmentNumber, 3)
    )
    .join('.')

  if (addressType === 'C') {
    const hostSegmentStart = Number(currNetNumber.split('.')[3])
    for (let i = 0; i < ipCount; i++) {
      const ipAddress = `${subNetSegmentCommon}.${hostSegmentStart + i}`
      // 注:去除本机地址 网关地址 网络地址 广播地址
      if (ipAddress !== networkAddress && ipAddress !== broadcastAddress && ipAddress !== address && ipAddress !== gateway) {
        availableIP.push(ipAddress)
      }
    }
  } else if (addressType === 'B') {
    const hostSegmentCommon = subNetSegment.splice(0, 1).join('')
    for (let i = 0; i < ipCount / subNets.length; i++) {
      const ipAddress = `${subNetSegmentCommon}.${hostSegmentCommon}.${i}`
      // 注:去除本机地址 网关地址 网络地址 广播地址
      if (ipAddress !== networkAddress && ipAddress !== broadcastAddress && ipAddress !== address && ipAddress !== gateway) {
        availableIP.push(ipAddress)
      }
    }
  }

  return { ...args, addressType, networkAddress, broadcastAddress, availableIP }
}

/**
 * 根据网卡名获取网卡所属网段以及网段下所有可用ip
 * @returns <Promise>
 */
const getAvailableIPByNetworkCardName = compose(
  getAllIPBySubNet,
  getSubNetByAddressAndNetMask,
  getGatewayByNetworkCardName,
  getLocalNetworkCardsInfo,
)

/**
 * 半开扫描
 * TCP SYN 扫描
 */
function halfOpenScan (ip) {
  net.createConnection(8088, '127.0.0.1', function () {

  })
}

halfOpenScan('10.60.9.36')

// getAvailableIPByNetworkCardName('en0').then(async ({gateway, availableIP}) => {
//   const promiseList = availableIP.map(ip => {
//     return halfOpenScan(ip)
//   })
//   await Promise.all(promiseList)
// })
