# Prints what App Store Connect holds for the East Village Everything listing (name,
# subtitle, URLs, categories, version copy, screenshot sets). Read-only. Run from the
# repo root with ASC_KEY_ID, ASC_ISSUER_ID and ASC_KEY_PATH exported from .env, using
# the gems bundled with the Homebrew fastlane install:
#   GEM_PATH=$(brew --prefix fastlane)/libexec GEM_HOME=$(brew --prefix fastlane)/libexec \
#     ruby apps/mobile/fastlane/verify_listing.rb
require 'spaceship'
Spaceship::ConnectAPI.token = Spaceship::ConnectAPI::Token.create(
  key_id: ENV.fetch('ASC_KEY_ID'), issuer_id: ENV.fetch('ASC_ISSUER_ID'),
  filepath: File.expand_path(ENV.fetch('ASC_KEY_PATH')), in_house: false)
app = Spaceship::ConnectAPI::App.find('com.eastvillageeverything.app')
puts "app: #{app.name} (#{app.id})"
info = app.fetch_edit_app_info || app.fetch_live_app_info
puts "categories: #{info.primary_category&.id} / #{info.secondary_category&.id}"
info.get_app_info_localizations.each do |l|
  puts "app info [#{l.locale}] name=#{l.name.inspect} subtitle=#{l.subtitle.inspect} privacy=#{l.privacy_policy_url.inspect}"
end
app.get_app_store_versions.each do |v|
  puts "version #{v.version_string} state=#{v.app_store_state} copyright=#{v.copyright.inspect}"
  v.get_app_store_version_localizations.each do |l|
    puts "  [#{l.locale}] promo=#{l.promotional_text.to_s.length}ch desc=#{l.description.to_s.length}ch keywords=#{l.keywords.inspect}"
    puts "  support=#{l.support_url.inspect} marketing=#{l.marketing_url.inspect} whats_new=#{l.whats_new.inspect}"
    l.get_app_screenshot_sets.each do |set|
      shots = set.app_screenshots
      puts "  screenshots #{set.screenshot_display_type}: #{shots.size} -> #{shots.map { |s| "#{s.file_name}(#{s.asset_delivery_state&.dig('state')})" }.join(', ')}"
    end
  end
end
