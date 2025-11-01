require 'json'

package = JSON.parse(File.read(File.join(__dir__, 'package.json')))

Pod::Spec.new do |s|
  s.name         = 'AudioFeatures'
  s.version      = package['version']
  s.summary      = 'On-device audio prosody features for InnerVoice.'
  s.description  = 'Extracts RMS, ZCR, F0 and speech ratio for emotion hints.'
  s.homepage     = 'https://example.com/innervoice'
  s.license      = { :type => 'MIT' }
  s.author       = { 'InnerVoice' => 'dev@innervoice.app' }
  s.platforms    = { :ios => '12.0' }
  s.source       = { :path => '.' }
  s.source_files = 'ios/**/*.{h,mm}'
  s.requires_arc = true

  s.dependency 'React-Core'
end
