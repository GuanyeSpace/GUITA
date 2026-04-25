App<IAppOption>({
  globalData: {
    launchTime: '',
    userInfo: null,
  },
  onLaunch() {
    this.globalData.launchTime = new Date().toISOString()
  },
})
