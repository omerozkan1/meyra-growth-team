# Generates MeyraCapture.xcodeproj: a tiny host app + an XCUITest target that drives the INSTALLED Meyra app
# (bundle id com.omerozkan.mira.ios) in the iOS Simulator. Apple tools only; the Flutter project is never touched.
# Usage: ruby media/capture/xcui/generate_project.rb
require 'xcodeproj'
require 'fileutils'

dir = File.expand_path(__dir__)
path = File.join(dir, 'MeyraCapture.xcodeproj')
FileUtils.rm_rf(path)
project = Xcodeproj::Project.new(path)

host = project.new_target(:application, 'CaptureHost', :ios, '17.0', nil, :swift)
host_group = project.main_group.new_group('CaptureHost', 'CaptureHost')
host.add_file_references([host_group.new_file('CaptureHostApp.swift')])

ui = project.new_target(:ui_test_bundle, 'CaptureUITests', :ios, '17.0', nil, :swift)
ui_group = project.main_group.new_group('CaptureUITests', 'CaptureUITests')
ui.add_file_references([ui_group.new_file('MeyraCaptureTests.swift')])
ui.add_dependency(host)

[host, ui].each do |t|
  t.build_configurations.each do |c|
    s = c.build_settings
    s['GENERATE_INFOPLIST_FILE'] = 'YES'
    s['SWIFT_VERSION'] = '5.0'
    s['CODE_SIGN_STYLE'] = 'Automatic'
    s['CODE_SIGN_IDENTITY'] = '-'
    s['DEVELOPMENT_TEAM'] = ''
    s['IPHONEOS_DEPLOYMENT_TARGET'] = '17.0'
    s['TARGETED_DEVICE_FAMILY'] = '1'
  end
end
host.build_configurations.each do |c|
  c.build_settings['PRODUCT_BUNDLE_IDENTIFIER'] = 'com.meyra.growth.capturehost'
  c.build_settings['INFOPLIST_KEY_UILaunchScreen_Generation'] = 'YES'
end
ui.build_configurations.each do |c|
  c.build_settings['PRODUCT_BUNDLE_IDENTIFIER'] = 'com.meyra.growth.captureuitests'
  c.build_settings['TEST_TARGET_NAME'] = 'CaptureHost'
end

project.save

scheme = Xcodeproj::XCScheme.new
scheme.configure_with_targets(host, ui)
scheme.test_action.add_testable(Xcodeproj::XCScheme::TestAction::TestableReference.new(ui)) if scheme.test_action.testables.empty?
scheme.save_as(path, 'MeyraCapture', true)
puts "generated #{path}"
