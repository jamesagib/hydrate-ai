Pod::Spec.new do |s|
  s.name         = 'HapticEngine'
  s.version      = '1.0.0'
  s.summary      = 'Arc Browser style pull-to-refresh haptics for React Native'
  s.homepage     = 'https://github.com/example/haptic-engine'
  s.license      = 'MIT'
  s.author       = { 'Your Name' => 'your.email@example.com' }
  s.platform     = :ios, '15.1'
  s.source       = { :git => 'https://github.com/example/haptic-engine.git', :tag => s.version.to_s }
  s.source_files = 'ios/**/*.{h,m,swift}'
  s.requires_arc = true
  s.frameworks   = 'CoreHaptics'

  s.dependency 'React-Core'
end 