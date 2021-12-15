# Rust一些你可能不知道的小技巧

## 就地取`&mut`进行函数调用
```rust
use rand::Rng;

fn main() {
    let mut rng = rand::thread_rng();
    loop {
        let rand_string: String = (&mut rng)
            .sample_iter(&rand::distributions::Alphanumeric)
            .take(30)
            .map(char::from)
            .collect();
        if rand_string.contains("test") {
            println!("Randomly generated {}", rand_string);
            return;
        }
    }
}
```