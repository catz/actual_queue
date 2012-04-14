require 'uri'
require 'net/http'

api_url = "http://127.0.0.1:8000/send_delayed"
url = "http://127.0.0.1:8000/health"
uid=(rand()*1000).to_i
type="test"
delay=10000
post_url = URI.parse(api_url)
res = Net::HTTP.post_form(post_url,{"url" => url, "delay" => delay, "uid" => uid, "type" => type})
p res.inspect