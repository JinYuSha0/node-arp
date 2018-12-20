{
    "targets": [{
    "target_name": "netUtils",
    "sources": [
      "netUtils.cc"
    ],
    "include_dirs": [
      "<!(node -e \"require('nan')\")"
    ]
  }]
}
