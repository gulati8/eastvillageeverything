# Prints the App Review state of the East Village Everything listing: each App Store
# version with its state, release type and attached build, plus the review
# submissions. Read-only. Run from the repo root with ASC_KEY_ID, ASC_ISSUER_ID and
# ASC_KEY_PATH exported from .env, using the gems bundled with Homebrew fastlane:
#   GEM_PATH=$(brew --prefix fastlane)/libexec GEM_HOME=$(brew --prefix fastlane)/libexec \
#     ruby apps/mobile/fastlane/review_status.rb
# Exits 0 when the version is past review (PENDING_DEVELOPER_RELEASE, READY_FOR_SALE or
# READY_FOR_DISTRIBUTION), 1 while it is still in the queue, 2 if Apple rejected it.
require 'spaceship'
Spaceship::ConnectAPI.token = Spaceship::ConnectAPI::Token.create(
  key_id: ENV.fetch('ASC_KEY_ID'), issuer_id: ENV.fetch('ASC_ISSUER_ID'),
  filepath: File.expand_path(ENV.fetch('ASC_KEY_PATH')), in_house: false)
app = Spaceship::ConnectAPI::App.find('com.eastvillageeverything.app')
puts "app: #{app.name} (#{app.id})"
states = []
app.get_app_store_versions(includes: 'build').each do |v|
  b = v.build
  states << v.app_store_state
  puts "version #{v.version_string} state=#{v.app_store_state} release_type=#{v.release_type.inspect} " \
       "build=#{b ? "#{b.version} (#{b.processing_state})" : 'none'}"
end
begin
  Spaceship::ConnectAPI.get_review_submissions(app_id: app.id).each do |s|
    puts "review submission #{s.id} state=#{s.state} platform=#{s.platform} submitted=#{s.submitted_date}"
  end
rescue StandardError => e
  puts "review submissions: #{e.class}: #{e.message}"
end
done = %w[PENDING_DEVELOPER_RELEASE READY_FOR_SALE READY_FOR_DISTRIBUTION]
rejected = %w[REJECTED METADATA_REJECTED DEVELOPER_REJECTED INVALID_BINARY]
exit 0 if states.any? { |s| done.include?(s) }
exit 2 if states.any? { |s| rejected.include?(s) }
exit 1
